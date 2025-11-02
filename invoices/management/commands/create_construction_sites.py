"""
工事現場データ作成コマンド

使用方法:
python manage.py create_construction_sites
"""

from django.core.management.base import BaseCommand
from invoices.models import ConstructionSite, Company
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = '工事現場のテストデータを作成します'

    def handle(self, *args, **kwargs):
        # 会社を取得（平野工務店）
        try:
            company = Company.objects.get(name='平野工務店')
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR('平野工務店が見つかりません'))
            return

        # 工事現場データ
        construction_sites = [
            {
                'name': '別府市新築工事',
                'location': '大分県別府市中央町1-2-3',
                'site_code': 'BP-2025-001',
                'start_date': datetime(2025, 1, 10),
                'estimated_end_date': datetime(2025, 12, 20),
                'description': '木造2階建て住宅新築工事',
            },
            {
                'name': '大分市リフォーム工事',
                'location': '大分県大分市府内町2-5-8',
                'site_code': 'OI-2025-002',
                'start_date': datetime(2025, 2, 1),
                'estimated_end_date': datetime(2025, 6, 30),
                'description': 'マンション全面リノベーション',
            },
            {
                'name': '由布市商業施設建設',
                'location': '大分県由布市湯布院町川上3-4',
                'site_code': 'YF-2025-003',
                'start_date': datetime(2025, 3, 1),
                'estimated_end_date': datetime(2026, 3, 31),
                'description': '温泉街商業複合施設建設',
            },
        ]

        created_count = 0
        for site_data in construction_sites:
            site, created = ConstructionSite.objects.get_or_create(
                company=company,
                site_code=site_data['site_code'],
                defaults={
                    'name': site_data['name'],
                    'location': site_data['location'],
                    'start_date': site_data['start_date'],
                    'estimated_end_date': site_data['estimated_end_date'],
                    'description': site_data['description'],
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ 工事現場作成: {site.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'- 既に存在: {site.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n合計 {created_count} 件の工事現場を作成しました')
        )