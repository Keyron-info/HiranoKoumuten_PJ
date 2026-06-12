"""
平野工務店から提供された正式名簿に基づき、ユーザーの氏名（漢字）を修正する。
メールアドレスをキーに更新。メール・役職・権限は変更しない。
"""
from django.db import migrations

# email → (正しい姓, 正しい名)
NAME_FIXES = {
    'sakai@hira-ko.jp':     ('堺', '信一郎'),    # 旧: 仁一郎
    'maki@hira-ko.jp':      ('眞木', '宜之'),    # 旧: 正之
    'nagamine@hira-ko.jp':  ('長峯', '真美'),    # 旧: 長嶺 貴典
    'koumu3@hira-ko.jp':    ('稲吉', '智紀'),    # 旧: 智帆
    'yutarous@hira-ko.jp':  ('佐藤', '雄太郎'),  # 旧: 基太郎
    'yoshida@hira-ko.jp':   ('吉田', '幸弘'),    # 旧: 尋也
    'sadohara@hira-ko.jp':  ('佐土原', '圭'),    # 旧: 煕
    'koumu1@hira-ko.jp':    ('相良', '宏隆'),    # 旧: 相見 忠博
    'takeshi-s@hira-ko.jp': ('佐藤', '岳志'),    # 旧: 岳信
    'tomonaga@hira-ko.jp':  ('友永', '真夫'),    # 旧: 貴美
    'higashi@hira-ko.jp':   ('東', '龍之亮'),    # 旧: 重之啓
    'someya@hira-ko.jp':    ('染矢', '啓登'),    # 旧: 染谷 宏人
    'miyako@hira-ko.jp':    ('都', '学志'),      # 旧: 亭吾
    # 変更なし: 赤嶺誠司 / 石本充 / 伊藤輝
}


def fix_names(apps, schema_editor):
    User = apps.get_model('invoices', 'User')
    updated = 0
    for email, (last, first) in NAME_FIXES.items():
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'[migration 0028] {email}: ユーザーが見つかりません（スキップ）')
            continue
        if user.last_name != last or user.first_name != first:
            old = f'{user.last_name} {user.first_name}'
            user.last_name = last
            user.first_name = first
            user.save(update_fields=['last_name', 'first_name'])
            print(f'[migration 0028] 修正: {old} → {last} {first} ({email})')
            updated += 1
    print(f'[migration 0028] 完了: {updated} 名の氏名を修正しました')


def reverse_migration(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0027_fix_submission_deadline_same_month'),
    ]

    operations = [
        migrations.RunPython(fix_names, reverse_migration),
    ]
