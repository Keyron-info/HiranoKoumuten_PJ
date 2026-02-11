from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from invoices.models import Invoice, ConstructionSite, ApprovalStep, ApprovalHistory, InvoiceComment

User = get_user_model()

class Command(BaseCommand):
    help = '重複ユーザーを統合・削除する（ID不整合の自動修復）'

    def handle(self, *args, **options):
        self.stdout.write("🔍 重複ユーザーの検査と修復を開始します...")
        
        # 1. 名前（漢字）での重複チェック
        duplicates = User.objects.values('last_name', 'first_name') \
            .annotate(count=Count('id')) \
            .filter(count__gt=1)

        for d in duplicates:
            last = d['last_name']
            first = d['first_name']
            self.stdout.write(f"\n👥 重複検出: {last} {first}")
            
            users = User.objects.filter(last_name=last, first_name=first).order_by('id')
            
            # 生かすユーザーを決定（IDが一番大きい＝最新、またはログイン履歴が新しい方）
            # ここではシンプルに「IDが一番大きい」ユーザーを正とする（現在のログインユーザーがID:19のような大きい数字であるため）
            # ただし、superuserは優先的に残すべきかもしれないが、今回は現場監督等の一般ユーザーを想定
            
            primary_user = users.last() # IDが最大のユーザー
            duplicate_users = users.exclude(id=primary_user.id)
            
            self.stdout.write(f"   ✅ 残すユーザー: ID={primary_user.id} ({primary_user.email})")
            
            for dup in duplicate_users:
                self.stdout.write(f"   ❌ 削除/統合対象: ID={dup.id} ({dup.email})")
                self.merge_users(dup, primary_user)

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
