from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from invoices.models import Invoice, ConstructionSite, ApprovalStep, ApprovalHistory, InvoiceComment

User = get_user_model()

class Command(BaseCommand):
    help = '重複ユーザーを統合・削除する（ID不整合の自動修復）'

    def handle(self, *args, **options):
        self.stdout.write("🔍 重複ユーザーの検査と修復を開始します...")

        # 1. 承認フローに関わる主要人物のみをターゲットにする（同姓同名の別人リスク回避）
        # system_users = [
        #     (last_name, first_name, email_key),
        # ]
        target_users = [
            ('田中', '一朗', 'tanaka'),
            ('堺', '仁一郎', 'sakai'),
            ('眞木', '正之', 'maki'),
            ('本城', '美代子', 'honjo'),
            ('竹田', '貴也', 'takeda'),
            ('赤嶺', '誠司', 'akamine'),
        ]

        for last, first, email_key in target_users:
            self.stdout.write(f"\n🔍 ターゲット検査: {last} {first} ({email_key})")
            
            # 条件: 「名字が一致」かつ「(名前が一致) または (メールにキーワードが含まれる)」
            # これにより、「田中次郎」さんが「田中一朗」として統合されるのを防ぐ
            
            candidates = User.objects.filter(
                Q(last_name=last) & 
                (Q(first_name=first) | Q(email__icontains=email_key))
            ).order_by('id')

            if candidates.count() > 1:
                self.stdout.write(f"   ⚠️ 重複あり: {candidates.count()}件")
                # 名前が全く違う人が混じっていないか最終チェック
                valid_candidates = []
                for u in candidates:
                    # 名前が空、または指定の名前と一致、またはメールが一致ならOK
                    # 別の名前が入っている場合は除外（例: Tanaka Jiro）
                    if (u.first_name and u.first_name != first and email_key not in u.email):
                        self.stdout.write(f"   🚫 除外（別人判定）: {u.last_name} {u.first_name}")
                        continue
                    valid_candidates.append(u)
                
                # フィルタ後のリストで再構成
                if len(valid_candidates) > 1:
                    # ID順に並んでいるので、最後（最新）を正とする
                    primary = valid_candidates[-1]
                    duplicates = valid_candidates[:-1]
                    
                    self.stdout.write(f"   ✅ 残すユーザー: ID={primary.id} ({primary.last_name} {primary.first_name})")
                    for dup in duplicates:
                        self.stdout.write(f"   ❌ 統合対象: ID={dup.id} ({dup.email})")
                        self.merge_users(dup, primary)
            else:
                self.stdout.write("   ✨ 重複なし")

    def _merge_group(self, users):
        # 廃止: 安全な個別ロジックに移行
        pass

    def merge_users(self, old_user, new_user):
        """old_userのデータをnew_userに付け替えて、old_userを削除"""
        
        # 1. 工事現場（監督）
        sites = ConstructionSite.objects.filter(supervisor=old_user)
        count = sites.count()
        sites.update(supervisor=new_user)
        if count > 0:
            self.stdout.write(f"      - 工事現場の監督を変更: {count}件")

        # 2. 請求書（現在の承認者）
        invoices_approver = Invoice.objects.filter(current_approver=old_user)
        count = invoices_approver.count()
        invoices_approver.update(current_approver=new_user)
        if count > 0:
            self.stdout.write(f"      - 請求書の承認担当を変更: {count}件")

        # 3. 請求書（作成者）
        invoices_created = Invoice.objects.filter(created_by=old_user)
        count = invoices_created.count()
        invoices_created.update(created_by=new_user)
        if count > 0:
            self.stdout.write(f"      - 請求書の作成者を変更: {count}件")

        # 4. 承認ルートステップ
        steps = ApprovalStep.objects.filter(approver_user=old_user)
        count = steps.count()
        steps.update(approver_user=new_user)
        if count > 0:
            self.stdout.write(f"      - 承認ステップの担当者を変更: {count}件")

        # 5. 承認履歴
        history = ApprovalHistory.objects.filter(user=old_user)
        count = history.count()
        history.update(user=new_user)
        if count > 0:
            self.stdout.write(f"      - 承認履歴のユーザーを変更: {count}件")

        # 6. コメント
        comments = InvoiceComment.objects.filter(user=old_user)
        count = comments.count()
        comments.update(user=new_user)
        if count > 0:
            self.stdout.write(f"      - コメントの投稿者を変更: {count}件")

        # 7. 古いユーザーを削除
        try:
            old_user.delete()
            self.stdout.write(f"      🗑️  ユーザー(ID={old_user.id})を削除しました")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"      ⚠️ 削除失敗: {e}"))
