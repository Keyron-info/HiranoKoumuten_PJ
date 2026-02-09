# invoices/management/commands/create_construction_types.py
"""
工種（ConstructionType）初期データ作成コマンド

Usage:
    python manage.py create_construction_types
"""

from django.core.management.base import BaseCommand
from invoices.models import ConstructionType


class Command(BaseCommand):
    help = '工種（品目）の初期データを作成します（20種類）'

    def handle(self, *args, **options):
        # 36種類の工種を定義
        construction_types = [
            ('direct_temporary', '直接仮設工事', '直接仮設工事', 1),
            ('earthwork', '土工事', '土工事', 2),
            ('pile', '杭工事', '杭工事', 3),
            ('reinforcement', '鉄筋工事', '鉄筋工事', 4),
            ('concrete', 'コンクリート工事', 'コンクリート工事', 5),
            ('formwork', '型枠工事', '型枠工事', 6),
            ('steel_structure', '鉄骨工事', '鉄骨工事', 7),
            ('waterproofing', '防水工事', '防水工事', 8),
            ('stone_tile', '石タイル工事', '石タイル工事', 9),
            ('alc', 'ALC工事', 'ALC工事', 10),
            ('roofing', '屋根樋工事', '屋根樋工事', 11),
            ('plastering', '左官工事', '左官工事', 12),
            ('metal', '金属工事', '金属工事', 13),
            ('metal_fittings', '金属製建具工事', '金属製建具工事', 14),
            ('wood_fittings', '木製建具工事', '木製建具工事', 15),
            ('glass', '硝子工事', '硝子工事', 16),
            ('painting', '塗装工事', '塗装工事', 17),
            ('carpentry', '木工事', '木工事', 18),
            ('light_steel', '軽鉄工事', '軽鉄工事', 19),
            ('insulation', '被覆工事', '被覆工事', 20),
            ('interior', '内装工事', '内装工事', 21),
            ('exterior', '外装工事', '外装工事', 22),
            ('fixtures', '什器工事', '什器工事', 23),
            ('furniture', '家具工事', '家具工事', 24),
            ('heating', '暖房器具工事', '暖房器具工事', 25),
            ('unit', 'ユニット工事', 'ユニット工事', 26),
            ('miscellaneous', '雑工事', '雑工事', 27),
            ('electrical', '電気設備工事', '電気設備工事', 28),
            ('plumbing', '給排水衛生設備工事', '給排水衛生設備工事', 29),
            ('hvac', '空調換気設備工事', '空調換気設備工事', 30),
            ('elevator', 'EV工事', 'EV工事', 31),
            ('mechanical', '機械設備工事', '機械設備工事', 32),
            ('other_equipment', 'その他設備工事', 'その他設備工事', 33),
            ('landscaping', '外構工事', '外構工事', 34),
            ('demolition', '解体工事', '解体工事', 35),
            ('other', 'その他工事', 'その他工事', 36),
        ]

        created_count = 0
        existing_count = 0

        for code, name, description, order in construction_types:
            obj, created = ConstructionType.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': description,
                    'display_order': order,
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ 作成: {name}'))
            else:
                existing_count += 1
                self.stdout.write(f'  既存: {name}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'完了: {created_count}件作成, {existing_count}件既存'
        ))
