import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Briefcase, FileText, Check, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';
import { userRegistrationAPI, RegistrationFormData } from '../api/userRegistration';

const CONSTRUCTION_TYPES = [
  '直接仮設工事', '土工事', '杭工事', '鉄筋工事', 'コンクリート工事',
  '型枠工事', '鉄骨工事', '防水工事', '石タイル工事', 'ALC工事',
  '屋根樋工事', '左官工事', '金属工事', '金属製建具工事', '木製建具工事',
  '硝子工事', '塗装工事', '木工事', '軽鉄工事', '被覆工事',
  '内装工事', '外装工事', '什器工事', '家具工事', '暖房器具工事',
  'ユニット工事', '雑工事', '電気設備工事', '給排水衛生設備工事',
  '空調換気設備工事', 'EV工事', '機械設備工事', 'その他設備工事',
  '外構工事', '解体工事', 'その他工事',
];

const REQUIRED = <span className="text-rose-400">*</span>;

const inputClass = (error?: string) =>
  `w-full px-4 py-3 bg-slate-800/50 border rounded-lg focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-white placeholder-slate-600 ${
    error ? 'border-rose-500/50' : 'border-slate-700'
  }`;

const labelClass = 'block text-sm font-medium text-slate-300 mb-1';

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <h2 className="text-base font-bold text-slate-200 border-b border-slate-700 pb-2 mb-5 flex items-center gap-2">
    <span className="text-primary-400">{icon}</span>
    {title}
  </h2>
);

const FieldNote: React.FC<{ text: string }> = ({ text }) => (
  <p className="mt-1 text-xs text-slate-500">{text}</p>
);

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    company_name_kana: '',
    department: '',
    postal_code: '',
    head_office_address: '',
    branch_office_address: '',
    email: '',
    invoice_email: '',
    phone_number: '',
    fax_number: '',
    contact_department: '',
    contact_position: '',
    contact_person: '',
    accounting_contact: '',
    main_construction_type: '',
    bank_name: '',
    bank_branch: '',
    bank_account_type: 'ordinary',
    bank_account_number: '',
    bank_account_holder: '',
    bank_account_holder_kana: '',
    invoice_registration_number: '',
    agree_terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.company_name.trim()) e.company_name = '業者名を入力してください';
    if (!formData.postal_code.trim()) e.postal_code = '郵便番号を入力してください';
    if (!formData.head_office_address.trim()) e.head_office_address = '本社の住所を入力してください';
    if (!formData.email.trim()) e.email = 'メールアドレスを入力してください';
    if (!formData.phone_number.trim()) e.phone_number = '電話番号を入力してください';
    if (!formData.main_construction_type) e.main_construction_type = 'メイン工種を選択してください';
    if (!formData.bank_name.trim()) e.bank_name = '銀行名を入力してください';
    if (!formData.bank_branch.trim()) e.bank_branch = '支店名を入力してください';
    if (!formData.bank_account_number.trim()) e.bank_account_number = '口座番号を入力してください';
    if (!formData.bank_account_holder.trim()) e.bank_account_holder = '口座名義を入力してください';
    if (!formData.bank_account_holder_kana.trim()) e.bank_account_holder_kana = '口座名義フリガナを入力してください';
    if (!formData.agree_terms) e.agree_terms = '利用規約に同意してください';

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRe.test(formData.email)) e.email = '正しいメールアドレス形式で入力してください';

    const postalRe = /^\d{3}-?\d{4}$/;
    if (formData.postal_code && !postalRe.test(formData.postal_code)) {
      e.postal_code = '正しい郵便番号形式で入力してください（例: 123-4567）';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) { window.scrollTo(0, 0); return; }
    setIsSubmitting(true);
    try {
      await userRegistrationAPI.register(formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      const data = error.response?.data;
      if (data && typeof data === 'object') setErrors(data);
      else alert('登録申請に失敗しました');
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-white/10">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/20 mb-6">
            <Check size={40} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">申請を受け付けました</h3>
          <p className="text-slate-300 mb-8">
            登録申請ありがとうございます。<br />
            承認完了後、メールにてお知らせいたします。<br />
            今しばらくお待ちください。
          </p>
          <p className="text-primary-400 font-medium">3秒後にログイン画面へ移動します...</p>
          <div className="mt-6">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium">
              すぐに移動しない場合はこちら
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} className="mr-1" />
            ログイン画面に戻る
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-white/10">
          <div className="bg-slate-900/50 px-8 py-6 border-b border-slate-700/50">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="text-primary-500" />
              新規業者登録申請
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              必要な情報を入力してください。<span className="text-rose-400">*</span> は必須項目です。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* エラーサマリー */}
            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 text-sm">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold mb-1">入力内容を確認してください</p>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    {Object.values(errors).slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                    {Object.values(errors).length > 5 && <li>その他 {Object.values(errors).length - 5} 件</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* ① 業者情報 */}
            <section>
              <SectionHeading icon={<Briefcase size={18} />} title="業者情報" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>業者名 {REQUIRED}</label>
                  <input name="company_name" value={formData.company_name} onChange={handleChange}
                    className={inputClass(errors.company_name)} placeholder="例: 株式会社〇〇建設" autoComplete="off" />
                  {errors.company_name && <p className="mt-1 text-xs text-rose-400">{errors.company_name}</p>}
                </div>
                <div>
                  <label className={labelClass}>業者名ふりがな</label>
                  <input name="company_name_kana" value={formData.company_name_kana} onChange={handleChange}
                    className={inputClass()} placeholder="例: かぶしきがいしゃ〇〇けんせつ" autoComplete="off" />
                </div>
                <div>
                  <label className={labelClass}>部署名</label>
                  <input name="department" value={formData.department} onChange={handleChange}
                    className={inputClass()} placeholder="回答がない場合は「なし」とご入力ください" autoComplete="off" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
                <div>
                  <label className={labelClass}>メイン工種 {REQUIRED}</label>
                  <select name="main_construction_type" value={formData.main_construction_type} onChange={handleChange}
                    className={inputClass(errors.main_construction_type)}>
                    <option value="">選択してください</option>
                    {CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.main_construction_type && <p className="mt-1 text-xs text-rose-400">{errors.main_construction_type}</p>}
                </div>
              </div>
            </section>

            {/* ② 所在地 */}
            <section>
              <SectionHeading icon={<MapPin size={18} />} title="所在地" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>郵便番号 {REQUIRED}</label>
                  <input name="postal_code" value={formData.postal_code} onChange={handleChange}
                    className={inputClass(errors.postal_code)} placeholder="例: 123-4567" autoComplete="off" />
                  <FieldNote text="ハイフンありで入力してください" />
                  {errors.postal_code && <p className="mt-1 text-xs text-rose-400">{errors.postal_code}</p>}
                </div>
                <div className="md:col-span-1" />
                <div className="md:col-span-2">
                  <label className={labelClass}>本社の住所 {REQUIRED}</label>
                  <textarea name="head_office_address" value={formData.head_office_address} onChange={handleChange}
                    rows={2} className={inputClass(errors.head_office_address)}
                    placeholder="例: 東京都〇〇区〇〇1-2-3" />
                  <FieldNote text="ハイフンありで入力してください" />
                  {errors.head_office_address && <p className="mt-1 text-xs text-rose-400">{errors.head_office_address}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>営業所の住所</label>
                  <textarea name="branch_office_address" value={formData.branch_office_address} onChange={handleChange}
                    rows={2} className={inputClass()} placeholder="回答がない場合は「なし」とご入力ください" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
              </div>
            </section>

            {/* ③ 連絡先 */}
            <section>
              <SectionHeading icon={<Mail size={18} />} title="連絡先" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>メインメールアドレス {REQUIRED}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className={inputClass(errors.email)} placeholder="例: info@example.co.jp" autoComplete="off" />
                  {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelClass}>請求書等送付先メールアドレス</label>
                  <input type="email" name="invoice_email" value={formData.invoice_email} onChange={handleChange}
                    className={inputClass()} placeholder="メインと同じ場合は「同上」" autoComplete="off" />
                  <FieldNote text="メインメールアドレスと同じ場合は「同上」とご入力ください" />
                </div>
                <div>
                  <label className={labelClass}>電話番号 {REQUIRED}</label>
                  <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange}
                    className={inputClass(errors.phone_number)} placeholder="例: 03-1234-5678" autoComplete="off" />
                  <FieldNote text="ハイフンありで入力してください" />
                  {errors.phone_number && <p className="mt-1 text-xs text-rose-400">{errors.phone_number}</p>}
                </div>
                <div>
                  <label className={labelClass}>FAX番号</label>
                  <input type="tel" name="fax_number" value={formData.fax_number} onChange={handleChange}
                    className={inputClass()} placeholder="例: 03-1234-5679" autoComplete="off" />
                  <FieldNote text="ハイフンありで入力してください" />
                </div>
              </div>
            </section>

            {/* ④ 担当者情報 */}
            <section>
              <SectionHeading icon={<User size={18} />} title="担当者情報" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>担当部署名</label>
                  <input name="contact_department" value={formData.contact_department} onChange={handleChange}
                    className={inputClass()} placeholder="回答がない場合は「なし」" autoComplete="off" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
                <div>
                  <label className={labelClass}>担当役職名</label>
                  <input name="contact_position" value={formData.contact_position} onChange={handleChange}
                    className={inputClass()} placeholder="回答がない場合は「なし」" autoComplete="off" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
                <div>
                  <label className={labelClass}>担当者（営業担当者等）</label>
                  <input name="contact_person" value={formData.contact_person} onChange={handleChange}
                    className={inputClass()} placeholder="回答がない場合は「なし」" autoComplete="off" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
                <div>
                  <label className={labelClass}>経理担当者</label>
                  <input name="accounting_contact" value={formData.accounting_contact} onChange={handleChange}
                    className={inputClass()} placeholder="回答がない場合は「なし」" autoComplete="off" />
                  <FieldNote text="回答がない場合は「なし」とご入力ください" />
                </div>
              </div>
            </section>

            {/* ⑤ 振込先金融機関情報 */}
            <section className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
              <SectionHeading icon={<span>🏦</span>} title="振込先金融機関情報" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>振込先　金融機関名 {REQUIRED}</label>
                  <input name="bank_name" value={formData.bank_name} onChange={handleChange}
                    className={inputClass(errors.bank_name)} placeholder="例: ○○銀行" autoComplete="off" />
                  {errors.bank_name && <p className="mt-1 text-xs text-rose-400">{errors.bank_name}</p>}
                </div>
                <div>
                  <label className={labelClass}>振込先　支店名 {REQUIRED}</label>
                  <input name="bank_branch" value={formData.bank_branch} onChange={handleChange}
                    className={inputClass(errors.bank_branch)} placeholder="例: 本店" autoComplete="off" />
                  {errors.bank_branch && <p className="mt-1 text-xs text-rose-400">{errors.bank_branch}</p>}
                </div>
                <div>
                  <label className={labelClass}>振込先　預金種目 {REQUIRED}</label>
                  <select name="bank_account_type" value={formData.bank_account_type} onChange={handleChange}
                    className={inputClass()}>
                    <option value="ordinary">普通</option>
                    <option value="current">当座</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>振込先　口座番号 {REQUIRED}</label>
                  <input name="bank_account_number" value={formData.bank_account_number} onChange={handleChange}
                    className={inputClass(errors.bank_account_number)} placeholder="例: 1234567" autoComplete="off" />
                  {errors.bank_account_number && <p className="mt-1 text-xs text-rose-400">{errors.bank_account_number}</p>}
                </div>
                <div>
                  <label className={labelClass}>振込先　口座名義 {REQUIRED}</label>
                  <input name="bank_account_holder" value={formData.bank_account_holder} onChange={handleChange}
                    className={inputClass(errors.bank_account_holder)} placeholder="例: カブシキカイシャ〇〇" autoComplete="off" />
                  {errors.bank_account_holder && <p className="mt-1 text-xs text-rose-400">{errors.bank_account_holder}</p>}
                </div>
                <div>
                  <label className={labelClass}>振込先　口座名義フリガナ {REQUIRED}</label>
                  <input name="bank_account_holder_kana" value={formData.bank_account_holder_kana} onChange={handleChange}
                    className={inputClass(errors.bank_account_holder_kana)} placeholder="例: カブシキカイシャ〇〇" autoComplete="off" />
                  {errors.bank_account_holder_kana && <p className="mt-1 text-xs text-rose-400">{errors.bank_account_holder_kana}</p>}
                </div>
              </div>
            </section>

            {/* ⑥ その他 */}
            <section>
              <SectionHeading icon={<FileText size={18} />} title="その他" />
              <div>
                <label className={labelClass}>適格請求書発行事業者登録番号（インボイス番号）</label>
                <input name="invoice_registration_number" value={formData.invoice_registration_number} onChange={handleChange}
                  className={inputClass()} placeholder="例: T1234567890123　回答がない場合は「なし」" autoComplete="off" />
                <FieldNote text="回答がない場合は「なし」とご入力ください" />
              </div>
            </section>

            {/* 利用規約同意 */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input id="agree_terms" name="agree_terms" type="checkbox"
                    checked={formData.agree_terms} onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-600 text-primary-500 focus:ring-primary-500 bg-slate-700" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="agree_terms" className="font-medium text-slate-200 select-none cursor-pointer">
                    利用規約に同意します {REQUIRED}
                  </label>
                  <p className="text-slate-400 mt-1">
                    <a href="/terms" target="_blank" className="text-primary-400 hover:text-primary-300 hover:underline font-medium">利用規約</a>
                    と
                    <a href="/privacy" target="_blank" className="text-primary-400 hover:text-primary-300 hover:underline font-medium ml-1">プライバシーポリシー</a>
                    を確認しました。
                  </p>
                  {errors.agree_terms && <p className="mt-2 text-xs text-rose-400 font-bold">{errors.agree_terms}</p>}
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="pt-4">
              <button type="submit" disabled={isSubmitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold text-lg hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    送信中...
                  </>
                ) : (
                  <><FileText size={20} />登録申請を送信</>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                ※ 管理者の承認後にアカウントが有効になります
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
