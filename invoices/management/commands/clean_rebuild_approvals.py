from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q
from invoices.models import Invoice, ConstructionSite, ApprovalStep, ApprovalHistory, InvoiceComment, ApprovalRoute

User = get_user_model()

class Command(BaseCommand):
    help = '重複ユーザーを整理し、承認ルートを再構築する'

    def handle(self, *args, **options):
        self.stdout.write("🚀 ユーザー整理と承認ルート再構築を開始します...")

        # ターゲットとなる主要メンバー (名前, メールの一部)
        # ここにあるメンバーについてのみ名寄せを行う
        targets = [
            {'name': '田中 一朗', 'email_key': 'tanaka', 'role': 'department_manager'},
            {'name': '赤嶺 誠司', 'email_key': 'akamine', 'role': 'site_supervisor'},
            {'name': '堺 仁一郎', 'email_key': 'sakai', 'role': 'senior_managing_director'},
            {'name': '眞木 正之', 'email_key': 'maki', 'role': 'president'},
            {'name': '本城 美代子', 'email_key': 'honjo', 'role': 'managing_director'},
            {'name': '竹田 貴也', 'email_key': 'takeda', 'role': 'accountant'},
        ]

        for target in targets:
            self.process_target(target)
            
        # 最後に承認ルートを再作成
        self.rebuild_routes()

    def process_target(self, target):
        name = target['name']
        email_key = target['email_key']
        role = target['role']
        
        self.stdout.write(f"\n🔍 {name} ({email_key}) の重複チェック中...")
        
        # 名前またはメールが一致するユーザーを検索
        # last_name, first_nameはスペース区切りで分解
        last, first = name.split(' ')
        
        users = User.objects.filter(
            Q(email__icontains=email_key) | 
            (Q(last_name=last) & Q(first_name=first))
        ).order_by('id')
        
        count = users.count()
        if count == 0:
            self.stdout.write(f"   ⚠️ ユーザーが見つかりません: {name}")
            return
        
        if count == 1:
            self.stdout.write(f"   ✅ 重複なし: {users.first().email} (ID: {users.first().id})")
            # 念のため役職を強制更新
            u = users.first()
            if u.position != role:
                u.position = role
                u.save()
                self.stdout.write(f"      役職を更新しました: {role}")
            return

        # 重複がある場合
        self.stdout.write(f"   ⚠️ {count}件の重複ユーザーを検出。統合処理を実行します。")
        
        # IDが一番大きいユーザーを正とする（最新）
        primary_user = users.last()
        duplicates = users.exclude(id=primary_user.id)
        
        self.stdout.write(f"   ⭐ 正(残す): ID={primary_user.id} {primary_user.email}")
        
        # 役職を確実にセット
        primary_user.position = role
        primary_user.user_type = 'internal'
        primary_user.save()

        for dup in duplicates:
            self.stdout.write(f"   🗑️ 副(削除): ID={dup.id} {dup.email}")
            self.merge_and_delete(dup, primary_user)

    def merge_and_delete(self, old_user, new_user):
        """データの付け替えと削除"""
        
        # 工事現場
        ConstructionSite.objects.filter(supervisor=old_user).update(supervisor=new_user)
        
        # 請求書（現在の承認者）
        Invoice.objects.filter(current_approver=old_user).update(current_approver=new_user)
        
        # 請求書（作成者）
        Invoice.objects.filter(created_by=old_user).update(created_by=new_user)
        
        # 承認ステップ（特定ユーザー指定のもの）
        ApprovalStep.objects.filter(approver_user=old_user).update(approver_user=new_user)
        
        # 承認履歴
        ApprovalHistory.objects.filter(user=old_user).update(user=new_user)
        
        # コメント
        InvoiceComment.objects.filter(user=old_user).update(user=new_user)
        
        # 古いユーザーを削除
        try:
            old_user.delete()
            self.stdout.write("      -> 統合完了・削除済み")
        except Exception as e:
            self.stdout.write(f"      -> 削除エラー: {e}")

    def rebuild_routes(self):
        self.stdout.write("\n🛠️ 承認ルートの再構築中...")
        
        # 既存のルートを取得（会社ごと）
        # ここではsetup_approval_routeコマンドを呼び出すのが確実だが、
        # 簡易的にインラインで主要ルートを修復する
        
        from django.core.management import call_command
        try:
            call_command('setup_approval_route')
            self.stdout.write("   ✅ 承認ルートセットアップコマンドを実行しました")
        except Exception as e:
            self.stdout.write(f"   ❌ ルート再構築エラー: {e}")
