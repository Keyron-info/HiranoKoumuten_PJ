from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from invoices.models import Company, CustomerCompany

User = get_user_model()

class Command(BaseCommand):
    help = '平野工務店の全ユーザーアカウントを作成'

    def handle(self, *args, **options):
        # 会社を取得または作成
        company, _ = Company.objects.get_or_create(
            name='平野工務店',
            defaults={
                'tax_number': '1234567890123',
                'company_type': 'client',
                'postal_code': '100-0001',
                'address': '東京都',
                'is_active': True
            }
        )
        self.stdout.write(f'会社: {company.name}')

        # ユーザーデータ（画像の表から）
        users_data = [
            # 決裁（役員）
            {
                'last_name': '堺', 
                'first_name': '信一郎',
                'last_name_kana': 'サカイ',
                'first_name_kana': 'ジンイチロウ',
                'email': 'sakai@hira-ko.jp',
                'position': 'president',  # 代表取締役社長（堺）
                'role': '決裁',
                'note': '承認フロー④社長承認'
            },
            {
                'last_name': '眞木',
                'first_name': '宜之', 
                'last_name_kana': 'マキ',
                'first_name_kana': 'マサユキ',
                'email': 'maki@hira-ko.jp',
                'position': 'senior_managing_director',  # 専務取締役（眞木）
                'role': '決裁',
                'note': '承認フロー③専務承認'
            },
            
            # 経理
            {
                'last_name': '本城',
                'first_name': '美代子',
                'last_name_kana': 'ホンジョウ',
                'first_name_kana': 'ミヨコ',
                'email': 'honjo@oita-kakiemon.jp',
                'position': 'managing_director',  # 常務取締役（本城）
                'role': '経理',
                'note': '承認フロー⑤常務承認・全評価期間・印刷'
            },
            {
                'last_name': '竹田',
                'first_name': '貴也',
                'last_name_kana': 'タケダ',
                'first_name_kana': 'タカヤ',
                'email': 'takeda@hira-ko.jp',
                'position': 'accountant',
                'role': '経理',
                'note': '全評価期間・印刷'
            },
            {
                'last_name': '郁瀬',
                'first_name': '夏也',
                'last_name_kana': 'イクセ',
                'first_name_kana': 'ナツヤ',
                'email': 'ikuse@hira-ko.jp',
                'position': 'accountant',
                'role': '経理',
                'note': '全評価期間・印刷'
            },
            {
                'last_name': '佐藤',
                'first_name': '奏',
                'last_name_kana': 'サトウ',
                'first_name_kana': 'カナ',
                'email': 'kana_sato@hira-ko.jp',
                'position': 'accountant',
                'role': '経理',
                'note': '全評価期間・印刷'
            },
            
            # 現場監督
            {
                'last_name': '赤嶺',
                'first_name': '誠司',
                'last_name_kana': 'アカミネ',
                'first_name_kana': 'セイジ',
                'email': 'akamine@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '申請・承認'
            },
            {
                'last_name': '長峯',
                'first_name': '真美',
                'last_name_kana': 'ナガミネ',
                'first_name_kana': 'タカノリ',
                'email': 'nagamine@hira-ko.jp',
                'position': 'department_manager',  # 部長（長嶺）
                'role': '部長',
                'note': '承認フロー②部長承認'
            },
            {
                'last_name': '稲吉',
                'first_name': '智紀',
                'last_name_kana': 'イナヨシ',
                'first_name_kana': 'トモホ',
                'email': 'koumu3@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '友永',
                'first_name': '真夫',
                'last_name_kana': 'トモナガ',
                'first_name_kana': 'タカミ',
                'email': 'tomonaga@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '佐土原',
                'first_name': '圭',
                'last_name_kana': 'サドハラ',
                'first_name_kana': 'ケイ',
                'email': 'sadohara@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '佐藤',
                'first_name': '岳志',
                'last_name_kana': 'サトウ',
                'first_name_kana': 'タケシ',
                'email': 'takeshi-s@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '吉田',
                'first_name': '幸弘',
                'last_name_kana': 'ヨシダ',
                'first_name_kana': 'ヒロヤ',
                'email': 'yoshida@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '相良',
                'first_name': '宏隆',
                'last_name_kana': 'アイミ',
                'first_name_kana': 'タダヒロ',
                'email': 'koumu1@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '石本',
                'first_name': '充',
                'last_name_kana': 'イシモト',
                'first_name_kana': 'ミツル',
                'email': 'ishimoto@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '東',
                'first_name': '龍之亮',
                'last_name_kana': 'ヒガシ',
                'first_name_kana': 'シゲユキノブ',
                'email': 'higashi@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': 'まだ権限なし'
            },
            {
                'last_name': '佐藤',
                'first_name': '雄太郎',
                'last_name_kana': 'サトウ',
                'first_name_kana': 'ユウタロウ',
                'email': 'yutarous@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '染矢',
                'first_name': '啓登',
                'last_name_kana': 'ソメヤ',
                'first_name_kana': 'ヒロト',
                'email': 'someya@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': '現場監督'
            },
            {
                'last_name': '伊藤',
                'first_name': '輝',
                'last_name_kana': 'イトウ',
                'first_name_kana': 'ヒカル',
                'email': 'ito@hira-ko.jp',
                'position': 'site_supervisor',
                'role': '現場監督',
                'note': 'まだ権限なし'
            },
            
            # 営業
            {
                'last_name': '都',
                'first_name': '学志',
                'last_name_kana': 'ミヤコ',
                'first_name_kana': 'サトゴ',
                'email': 'miyako@hira-ko.jp',
                'position': 'staff',
                'role': '営業',
                'note': 'まだ権限なし'
            },
        ]

        # ユーザー作成
        created_count = 0
        updated_count = 0
        
        for user_data in users_data:
            email = user_data['email']
            
            # ユーザー名を生成（メールアドレスをそのまま使用してユニーク性を保証）
            username = email
            
            # 既存ユーザーをチェック
            user = User.objects.filter(email=email).first()
            
            if user:
                # 既存ユーザーを更新
                user.username = username
                user.last_name = user_data['last_name']
                user.first_name = user_data['first_name']
                user.user_type = 'internal'
                user.company = company
                user.position = user_data['position']
                user.is_active = True
                user.save()
                
                self.stdout.write(
                    self.style.WARNING(
                        f'✏️  更新: {user.last_name} {user.first_name} ({user_data["role"]}) - {email}'
                    )
                )
                updated_count += 1
            else:
                # 新規ユーザーを作成
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password='test1234',  # 初期パスワード
                    last_name=user_data['last_name'],
                    first_name=user_data['first_name'],
                    user_type='internal',
                    company=company,
                    position=user_data['position'],
                    is_active=True
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ 作成: {user.last_name} {user.first_name} ({user_data["role"]}) - {email}'
                    )
                )
                created_count += 1

        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✨ 完了: {created_count}件作成, {updated_count}件更新'
            )
        )
        self.stdout.write(f'\n📧 全ユーザーのパスワード: test1234')
        self.stdout.write('\n' + '='*60)
        
        # サマリー
        self.stdout.write('\n【役職別サマリー】')
        self.stdout.write(f'  代表取締役社長: {User.objects.filter(position="president").count()}人')
        self.stdout.write(f'  専務取締役: {User.objects.filter(position="senior_managing_director").count()}人')
        self.stdout.write(f'  常務取締役: {User.objects.filter(position="managing_director").count()}人')
        self.stdout.write(f'  部長: {User.objects.filter(position="department_manager").count()}人')
        self.stdout.write(f'  経理担当: {User.objects.filter(position="accountant").count()}人')
        self.stdout.write(f'  現場監督: {User.objects.filter(position="site_supervisor").count()}人')
        self.stdout.write(f'  一般社員: {User.objects.filter(position="staff").count()}人')
