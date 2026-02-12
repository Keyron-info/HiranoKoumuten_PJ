"""
Migration 0021: 田中削除・役職修正・承認ルート再構築

変更内容:
- 田中一朗ユーザーを無効化（is_active=False）
- 長嶺貴典 → 部長 (department_manager)
- 眞木正之 → 専務 (senior_managing_director)
- 堺仁一郎 → 社長 (president)
- 本城美代子 → 常務 (managing_director) ※変更なし
- 承認ルート再構築: 現場監督→部長→専務→社長→常務→経理
- 既存pending請求書の承認者を新ルートに移行
"""

from django.db import migrations


def fix_roles_and_routes(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    ApprovalRoute = apps.get_model('invoices', 'ApprovalRoute')
    ApprovalStep = apps.get_model('invoices', 'ApprovalStep')
    Company = apps.get_model('invoices', 'Company')
    Invoice = apps.get_model('invoices', 'Invoice')

    print("\n=== Migration 0021: 田中削除・役職修正・承認ルート再構築 ===")

    # ===== 1. 田中一朗を無効化 =====
    tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
    if tanaka:
        tanaka.is_active = False
        tanaka.save()
        print(f"  ✅ 田中一朗 (ID:{tanaka.id}) を無効化しました")
    else:
        print("  ℹ️ 田中一朗は存在しません")

    # ===== 2. 役職を修正 =====
    role_fixes = [
        {'email': 'nagamine@hira-ko.jp', 'position': 'department_manager', 'name': '長嶺貴典→部長'},
        {'email': 'maki@hira-ko.jp', 'position': 'senior_managing_director', 'name': '眞木正之→専務'},
        {'email': 'sakai@hira-ko.jp', 'position': 'president', 'name': '堺仁一郎→社長'},
        {'email': 'honjo@oita-kakiemon.jp', 'position': 'managing_director', 'name': '本城美代子→常務'},
    ]

    for fix in role_fixes:
        user = User.objects.filter(email=fix['email']).first()
        if user:
            user.position = fix['position']
            user.save()
            print(f"  ✅ {fix['name']} (ID:{user.id})")
        else:
            print(f"  ⚠️ {fix['email']} が見つかりません")

    # ===== 3. 承認ルートを再構築 =====
    company = Company.objects.first()
    if not company:
        print("  ❌ 会社が見つかりません。中断します。")
        return

    # 全既存ルートを削除
    old_routes = ApprovalRoute.objects.filter(company=company)
    deleted_count = old_routes.count()
    old_routes.delete()
    print(f"  🗑️ 旧ルート {deleted_count} 件を削除")

    # 新ルート作成
    route = ApprovalRoute.objects.create(
        company=company,
        name='標準承認ルート',
        is_default=True,
        is_active=True
    )
    print(f"  ✅ 新ルート作成 (ID:{route.id})")

    # ユーザー取得
    nagamine = User.objects.filter(email='nagamine@hira-ko.jp', is_active=True).first()
    maki = User.objects.filter(email='maki@hira-ko.jp', is_active=True).first()
    sakai = User.objects.filter(email='sakai@hira-ko.jp', is_active=True).first()
    honjo = User.objects.filter(email='honjo@oita-kakiemon.jp', is_active=True).first()

    # 承認ステップ作成 (現場監督→部長→専務→社長→常務→経理)
    steps = [
        (1, '現場監督承認', 'site_supervisor', None),
        (2, '部長承認', 'department_manager', nagamine),
        (3, '専務承認', 'senior_managing_director', maki),
        (4, '社長承認', 'president', sakai),
        (5, '常務承認', 'managing_director', honjo),
        (6, '経理確認', 'accountant', None),
    ]

    step_objects = {}
    for order, name, position, user in steps:
        step = ApprovalStep.objects.create(
            route=route,
            step_order=order,
            step_name=name,
            approver_position=position,
            approver_user=user,
            is_required=True
        )
        step_objects[order] = step
        user_name = f"{user.last_name} {user.first_name}" if user else "(役職指定)"
        print(f"    Step {order}: {name} → {user_name}")

    # ===== 4. 既存の承認待ち請求書を新ルートに移行 =====
    pending_invoices = Invoice.objects.filter(status='pending_approval')
    print(f"\n  📄 承認待ち請求書: {pending_invoices.count()} 件")

    for invoice in pending_invoices:
        old_step = invoice.current_approval_step
        old_approver = invoice.current_approver

        if old_step:
            old_position = old_step.approver_position
            # 旧ステップの役職に対応する新ステップを探す
            new_step = ApprovalStep.objects.filter(
                route=route, approver_position=old_position
            ).first()

            if new_step:
                invoice.approval_route = route
                invoice.current_approval_step = new_step
                # 新ステップのユーザーに変更
                if new_step.approver_user:
                    invoice.current_approver = new_step.approver_user
                invoice.save()
                new_approver_name = invoice.current_approver.last_name if invoice.current_approver else "N/A"
                print(f"    請求書 {invoice.invoice_number}: Step→{new_step.step_name}, 承認者→{new_approver_name}")
            else:
                # 対応するステップがない場合、最初のステップに戻す
                first_step = step_objects[1]
                invoice.approval_route = route
                invoice.current_approval_step = first_step
                invoice.current_approver = None
                invoice.save()
                print(f"    請求書 {invoice.invoice_number}: 最初のステップに戻しました")
        else:
            # ステップ未設定の場合
            invoice.approval_route = route
            invoice.current_approval_step = step_objects[1]
            invoice.save()
            print(f"    請求書 {invoice.invoice_number}: 最初のステップを設定しました")

    print("\n=== Migration 0021 完了 ===\n")


def reverse_migration(apps, schema_editor):
    # 逆マイグレーションは田中の再有効化のみ
    User = apps.get_model('invoices', 'User')
    tanaka = User.objects.filter(email='tanaka@hira-ko.jp').first()
    if tanaka:
        tanaka.is_active = True
        tanaka.save()


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0020_force_tanaka_and_route'),
    ]

    operations = [
        migrations.RunPython(fix_roles_and_routes, reverse_migration),
    ]
