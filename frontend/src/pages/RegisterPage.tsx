import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Briefcase, FileText, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { userRegistrationAPI, RegistrationFormData } from '../api/userRegistration';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    full_name: '',
    email: '',
    confirm_email: '',
    phone_number: '',
    postal_code: '',
    address: '',
    department: '',
    position: '',
    notes: '',
    agree_terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore - TS doesn't strictly check input types here for checked property
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // エラークリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 必須チェック
    if (!formData.company_name.trim()) newErrors.company_name = '会社名を入力してください';
    if (!formData.full_name.trim()) newErrors.full_name = '氏名を入力してください';
    if (!formData.email.trim()) newErrors.email = 'メールアドレスを入力してください';
    if (!formData.confirm_email.trim()) newErrors.confirm_email = 'メールアドレス（確認）を入力してください';
    if (!formData.phone_number.trim()) newErrors.phone_number = '電話番号を入力してください';
    if (!formData.postal_code.trim()) newErrors.postal_code = '郵便番号を入力してください';
    if (!formData.address.trim()) newErrors.address = '住所を入力してください';
    if (!formData.agree_terms) newErrors.agree_terms = '利用規約に同意してください';

    // メール一致チェック
    if (formData.email && formData.confirm_email && formData.email !== formData.confirm_email) {
      newErrors.confirm_email = 'メールアドレスが一致しません';
    }

    // メール形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = '正しいメールアドレス形式で入力してください';
    }

    // 電話番号形式チェック
    const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{4}$/;
    if (formData.phone_number && !phoneRegex.test(formData.phone_number)) {
      newErrors.phone_number = '正しい電話番号形式で入力してください';
    }

    // 郵便番号形式チェック
    const postalRegex = /^\d{3}-?\d{4}$/;
    if (formData.postal_code && !postalRegex.test(formData.postal_code)) {
      newErrors.postal_code = '正しい郵便番号形式で入力してください（例: 123-4567）';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);

    try {
      await userRegistrationAPI.register(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login'); // 通常はログイン画面へ、または完了画面があればそちらへ
      }, 3000);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          setErrors(errorData);
        } else if (typeof errorData === 'string') {
          alert(errorData);
        } else {
          alert('登録申請に失敗しました');
        }
      } else {
        alert('エラーが発生しました');
      }
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
              <User className="text-primary-500" />
              新規ユーザー登録
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              必要な情報を入力してアカウント申請を行ってください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* エラーサマリー */}
            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 text-sm mb-6">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold mb-1">入力内容を確認してください</p>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    {Object.values(errors).slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {Object.values(errors).length > 3 && <li>その他 {Object.values(errors).length - 3} 件のエラー</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* 基本情報セクション */}
            <section>
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 mb-6 flex items-center gap-2">
                <Briefcase size={20} className="text-primary-500" />
                基本情報
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 会社名 */}
                <div className="col-span-1 md:col-span-2">
                  <FormInput
                    label="会社名"
                    id="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="例: 株式会社サンプル建設"
                    required
                    error={errors.company_name}
                  />
                </div>

                {/* 氏名 */}
                <div className="col-span-1 md:col-span-2">
                  <FormInput
                    label="氏名"
                    id="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="例: 山田 太郎"
                    required
                    error={errors.full_name}
                    icon={<User size={18} className="text-slate-500" />}
                  />
                </div>

                {/* メールアドレス */}
                <div className="col-span-1">
                  <FormInput
                    label="メールアドレス"
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@company.co.jp"
                    required
                    error={errors.email}
                    icon={<Mail size={18} className="text-slate-500" />}
                  />
                </div>

                {/* メールアドレス（確認） */}
                <div className="col-span-1">
                  <FormInput
                    label="メールアドレス（確認）"
                    id="confirm_email"
                    type="email"
                    value={formData.confirm_email}
                    onChange={handleChange}
                    placeholder="example@company.co.jp"
                    required
                    error={errors.confirm_email}
                    icon={<Mail size={18} className="text-slate-500" />}
                  />
                </div>
              </div>
            </section>

            {/* 連絡先情報セクション */}
            <section>
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-primary-500" />
                連絡先情報
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 電話番号 */}
                <div className="col-span-1">
                  <FormInput
                    label="電話番号"
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="090-1234-5678"
                    required
                    error={errors.phone_number}
                    icon={<Phone size={18} className="text-slate-500" />}
                  />
                </div>

                {/* 郵便番号 */}
                <div className="col-span-1">
                  <FormInput
                    label="郵便番号"
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="123-4567"
                    required
                    error={errors.postal_code}
                  />
                </div>

                {/* 住所 */}
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1">
                    住所 <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-4 py-3 bg-slate-800/50 border rounded-lg focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-white placeholder-slate-600 ${errors.address ? 'border-rose-500/50 ring-rose-500/20' : 'border-slate-700'
                      }`}
                    placeholder="都道府県、市区町村、番地、建物名など"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-rose-400">{errors.address}</p>
                  )}
                </div>
              </div>
            </section>

            {/* その他情報セクション */}
            <section>
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 mb-6 flex items-center gap-2">
                <FileText size={20} className="text-primary-500" />
                その他
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 部署 */}
                <div className="col-span-1">
                  <FormInput
                    label="部署"
                    id="department"
                    value={formData.department || ''}
                    onChange={handleChange}
                    placeholder="例: 営業部"
                  />
                </div>

                {/* 役職 */}
                <div className="col-span-1">
                  <FormInput
                    label="役職"
                    id="position"
                    value={formData.position || ''}
                    onChange={handleChange}
                    placeholder="例: 課長"
                  />
                </div>

                {/* 備考 */}
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">
                    備考
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-white placeholder-slate-600"
                    placeholder="その他連絡事項があればご記入ください"
                  />
                </div>
              </div>
            </section>

            {/* 利用規約同意 */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="agree_terms"
                    name="agree_terms"
                    type="checkbox"
                    checked={formData.agree_terms}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-600 text-primary-500 focus:ring-primary-500 bg-slate-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="agree_terms" className="font-medium text-slate-200 select-none cursor-pointer">
                    利用規約に同意します <span className="text-rose-400">*</span>
                  </label>
                  <p className="text-slate-400 mt-1">
                    <a href="/terms" target="_blank" className="text-primary-400 hover:text-primary-300 hover:underline font-medium">
                      利用規約
                    </a>
                    と
                    <a href="/privacy" target="_blank" className="text-primary-400 hover:text-primary-300 hover:underline font-medium ml-1">
                      プライバシーポリシー
                    </a>
                    を確認しました。
                  </p>
                  {errors.agree_terms && (
                    <p className="mt-2 text-xs text-rose-400 font-bold">{errors.agree_terms}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold text-lg hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信中...
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    登録申請を送信
                  </>
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

// 入力コンポーネント (Dark Theme)
interface FormInputProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({
  label, id, type = 'text', value, onChange, placeholder, required = false, error, icon
}) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-400 transition-colors">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} pr-4 py-3 bg-slate-800/50 border rounded-lg focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-white placeholder-slate-600 ${error ? 'border-rose-500/50 ring-rose-500/20' : 'border-slate-700'
            }`}
          placeholder={placeholder}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
};

export default RegisterPage;