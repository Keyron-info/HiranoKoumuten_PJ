"""
工種マスタを指定の36種類に更新する。
- 既存レコードで新リストにないものは無効化
- 既存レコードで名前が変わったものは更新
- 新リストにあって存在しないものは追加
"""
from django.db import migrations

NEW_TYPES = [
    ('direct_temporary',  '直接仮設工事',       1),
    ('earthwork',         '土工事',             2),
    ('pile',              '杭工事',             3),
    ('reinforcement',     '鉄筋工事',           4),
    ('concrete',          'コンクリート工事',    5),
    ('formwork',          '型枠工事',           6),
    ('steel_structure',   '鉄骨工事',           7),
    ('waterproofing',     '防水工事',           8),
    ('stone_tile',        '石タイル工事',        9),
    ('alc',               'ALC工事',           10),
    ('roofing',           '屋根樋工事',         11),
    ('plastering',        '左官工事',           12),
    ('metal',             '金属工事',           13),
    ('metal_fittings',    '金属製建具工事',      14),
    ('wood_fittings',     '木製建具工事',        15),
    ('glass',             '硝子工事',           16),
    ('painting',          '塗装工事',           17),
    ('carpentry',         '木工事',             18),
    ('light_steel',       '軽鉄工事',           19),
    ('insulation',        '被覆工事',           20),
    ('interior',          '内装工事',           21),
    ('exterior',          '外装工事',           22),
    ('fixtures',          '什器工事',           23),
    ('furniture',         '家具工事',           24),
    ('heating',           '暖房器具工事',        25),
    ('unit',              'ユニット工事',        26),
    ('miscellaneous',     '雑工事',             27),
    ('electrical',        '電気設備工事',        28),
    ('plumbing',          '給排水衛生設備工事',  29),
    ('hvac',              '空調換気設備工事',    30),
    ('elevator',          'EV工事',             31),
    ('mechanical',        '機械設備工事',        32),
    ('other_equipment',   'その他設備工事',      33),
    ('landscaping',       '外構工事',           34),
    ('demolition',        '解体工事',           35),
    ('other',             'その他工事',         36),
]

NEW_CODES = {code for code, _, _ in NEW_TYPES}


def update_construction_types(apps, schema_editor):
    ConstructionType = apps.get_model('invoices', 'ConstructionType')

    # 既存レコードのうち新リストにないものを無効化
    ConstructionType.objects.exclude(code__in=NEW_CODES).update(is_active=False)

    # 新リストを upsert
    for code, name, order in NEW_TYPES:
        obj, created = ConstructionType.objects.get_or_create(code=code)
        obj.name = name
        obj.display_order = order
        obj.is_active = True
        obj.save()


def reverse_func(apps, schema_editor):
    pass  # 元には戻さない


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0031_userregistrationrequest_new_fields'),
    ]

    operations = [
        migrations.RunPython(update_construction_types, reverse_func),
    ]
