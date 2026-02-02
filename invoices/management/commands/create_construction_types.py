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
        # 20種類の工種を定義
        construction_types = [
            # 基本15種類
            ('exterior_wall', '外壁', '外壁工事全般', 1),
            ('interior', '内装', '内装仕上げ工事', 2),
            ('electrical', '電気', '電気設備工事', 3),
            ('plumbing', '給排水', '給排水設備工事', 4),
            ('air_conditioning', '空調', '空調設備工事', 5),
            ('foundation', '基礎', '基礎工事', 6),
            ('structural', '躯体', '躯体工事', 7),
            ('roofing', '屋根', '屋根工事', 8),
            ('waterproofing', '防水', '防水工事', 9),
            ('painting', '塗装', '塗装工事', 10),
            ('flooring', '床', '床仕上げ工事', 11),
            ('carpentry', '大工', '大工工事', 12),
            ('landscaping', '外構', '外構工事', 13),
            ('demolition', '解体', '解体工事', 14),
            ('temporary', '仮設', '仮設工事', 15),
            # 追加5種類
            ('scaffolding', '足場', '足場工事', 16),
            ('steel_frame', '鉄骨', '鉄骨工事', 17),
            ('sheet_metal', '板金', '板金工事', 18),
            ('glass', 'ガラス', 'ガラス工事', 19),
            ('equipment', '設備', '設備工事全般', 20),
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
