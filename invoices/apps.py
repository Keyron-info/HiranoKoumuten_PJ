from django.apps import AppConfig


class InvoicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'invoices'

    def ready(self):
        # App Runner 起動時に工種マスタを36種類に同期する
        try:
            from django.db import connection
            tables = connection.introspection.table_names()
            if 'construction_types' not in tables:
                return

            from .models import ConstructionType
            TYPES = [
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
            new_codes = {code for code, _, _ in TYPES}
            ConstructionType.objects.exclude(code__in=new_codes).update(is_active=False)
            for code, name, order in TYPES:
                obj, _ = ConstructionType.objects.get_or_create(code=code)
                obj.name = name
                obj.display_order = order
                obj.is_active = True
                obj.save()
        except Exception:
            pass
