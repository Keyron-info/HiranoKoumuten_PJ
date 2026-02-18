"""
Migration 0022: ユーザー名・役職・承認ルートの修正

スプレッドシートの正式データに基づいて以下を修正:
- 長嶺 貴典 → 長峯 真美（名前修正）、役職: department_manager（部長）
- 眞木 正之 → 眞木 宣之（名前修正）、役職: managing_director（常務取締役）
- 本城 美代子: 役職: senior_managing_director（専務取締役）※0021で誤って常務になっていた
- 竹田 貴也 → 竹田 鉄也（名前修正）
- 承認ルートを再構築: 現場監督→部長(長峯)→専務(本城)→社長(堺)→常務(眞木)→経理
"""

from django.db import migrations


def fix_names_and_roles(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    ApprovalRoute = apps.get_model('invoices', 'ApprovalRoute')
    ApprovalStep = apps.get_model('invoices', 'ApprovalStep')
    Company = apps.get_model('invoices', 'Company')

    print("\n=== Migration 0022: ユーザー名・役職・承認ルート修正 ===")

    # ===== 1. ユーザー名・役職を正しく修正 =====
    fixes = [
        # (email, last_name, first_name, position, 説明)
        ('nagamine@hira-ko.jp',        '長峯', '真美',  'department_manager',       '長峯真美→部長'),
        ('maki@hira-ko.jp',            '眞木', '宣之',  'managing_director',        '眞木宣之→常務取締役'),
        ('honjo@oita-kakiemon.jp',     '本城', '美代子', 'senior_managing_director', '本城美代子→専務取締役'),
        ('sakai@hira-ko.jp',           '堺',   '仁一郎', 'president',               '堺仁一郎→社長'),
        ('takeda@hira-ko.jp',          '竹田', '鉄也',  'accountant',               '竹田鉄也→経理'),
    ]

    for email, last, first, position, label in fixes:
        user = User.objects.filter(email=email).first()
        if user:
            user.last_name = last
            user.first_name = first
            user.position = position
            user.is_active = True
            user.save()
            print(f"  ✅ {label} (ID:{user.id})")
        else:
            print(f"  ⚠️ {email} が見つかりません")

    # ===== 2. 承認ルートを再構築 =====
    company = Company.objects.first()
    if not company:
        print("  ❌ 会社が見つかりません。中断します。")
        return

    # 全既存ルートを削除
    old_count = ApprovalRoute.objects.filter(company=company).count()
    ApprovalRoute.objects.filter(company=company).delete()
    print(f"  🗑️ 旧ルート {old_count} 件を削除")

    # 新ルート作成
    route = ApprovalRoute.objects.create(
        company=company,
        name='標準承認ルート',
        is_default=True,
        is_active=True
    )
    print(f"  ✅ 新ルート作成 (ID:{route.id})")

    # ユーザー取得（修正済みの名前・役職で）
    nagamine = User.objects.filter(email='nagamine@hira-ko.jp', is_active=True).first()   # 部長
    honjo    = User.objects.filter(email='honjo@oita-kakiemon.jp', is_active=True).first() # 専務
    sakai    = User.objects.filter(email='sakai@hira-ko.jp', is_active=True).first()       # 社長
    maki     = User.objects.filter(email='maki@hira-ko.jp', is_active=True).first()        # 常務

    # 承認ステップ: 現場監督→部長(長峯)→専務(本城)→社長(堺)→常務(眞木)→経理
    steps = [
        (1, '現場監督承認', 'site_supervisor',          None),
        (2, '部長承認',     'department_manager',       nagamine),
        (3, '専務承認',     'senior_managing_director', honjo),
        (4, '社長承認',     'president',                sakai),
        (5, '常務承認',     'managing_director',        maki),
        (6, '経理確認',     'accountant',               None),
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

    # ===== 3. 既存の承認待ち請求書を新ルートに移行 =====
    Invoice = apps.get_model('invoices', 'Invoice')
    pending_invoices = Invoice.objects.filter(status='pending_approval')
    print(f"\n  📄 承認待ち請求書: {pending_invoices.count()} 件")

    for invoice in pending_invoices:
        old_step = invoice.current_approval_step
        if old_step:
            new_step = ApprovalStep.objects.filter(
                route=route, approver_position=old_step.approver_position
            ).first()
            if new_step:
                invoice.approval_route = route
                invoice.current_approval_step = new_step
                if new_step.approver_user:
                    invoice.current_approver = new_step.approver_user
                invoice.save()
                print(f"    請求書 {invoice.invoice_number}: {new_step.step_name} に移行")
            else:
                invoice.approval_route = route
                invoice.current_approval_step = step_objects[1]
                invoice.current_approver = None
                invoice.save()
                print(f"    請求書 {invoice.invoice_number}: 最初のステップに戻しました")
        else:
            invoice.approval_route = route
            invoice.current_approval_step = step_objects[1]
            invoice.save()

    print("\n=== Migration 0022 完了 ===\n")


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0021_remove_tanaka_fix_roles_and_routes'),
    ]

    operations = [
        migrations.RunPython(fix_names_and_roles, migrations.RunPython.noop),
    ]
