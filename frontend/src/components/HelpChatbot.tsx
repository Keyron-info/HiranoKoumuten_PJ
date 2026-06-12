// src/components/HelpChatbot.tsx
// 使い方ヘルプチャットボット（FAQ ルールベース）

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  options?: string[];
}

interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
  forUserType?: 'internal' | 'customer';
}

const FAQ: FaqEntry[] = [
  {
    keywords: ['請求書', '作成', '作り方', '新規'],
    question: '請求書の作成方法',
    answer:
      '【請求書の作成手順】\n1. メニューの「請求書作成」をクリック\n2. 現場パスワードを入力（平野工務店の担当者から受け取ってください）\n3. 工事名・請求日・工種を選択\n4. 明細（品名・数量・単価）を入力\n5. 「下書き保存」で保存されます\n\n下書き保存後、詳細画面の「提出する」ボタンで提出してください。',
    forUserType: 'customer',
  },
  {
    keywords: ['提出', '出せない', '提出できない', 'エラー'],
    question: '請求書が提出できない',
    answer:
      '【提出できない主な原因】\n・提出期間外（基本は毎月26日〜末日）\n・対象月が締め処理済み\n・工事現場に現場監督が未設定\n\n期間外に提出が必要な場合は、平野工務店の経理担当者に「特例パスワード」の発行を依頼してください。',
    forUserType: 'customer',
  },
  {
    keywords: ['期限', '締め', '締切', 'いつまで', '受付'],
    question: '提出期限について',
    answer:
      '【請求書の受付期間】\n・対象期間：前月26日〜当月25日分\n・受付期間：当月26日〜末日（基本）\n\n期限を過ぎた場合は経理担当者に特例パスワードの発行を依頼してください。',
  },
  {
    keywords: ['差し戻し', '差戻', '戻された', '修正'],
    question: '差し戻しされた場合の対応',
    answer:
      '【差し戻し対応の手順】\n1. 通知またはダッシュボードで差し戻しを確認\n2. 請求書詳細で差し戻し理由を確認\n3. 経理が修正した内容（赤ペン修正）を確認\n4. 「修正内容を承認する」ボタンをクリック\n5. 自動的に承認フローが再開されます',
  },
  {
    keywords: ['承認', 'フロー', '誰が', '順番'],
    question: '承認フローの順番',
    answer:
      '【承認フロー】\n提出 → ①現場監督 → ②部長 → ③専務 → ④社長 → ⑤常務 → ⑥経理確認 → 支払い\n\n各承認者には自動で通知が届きます。差し戻しが発生した場合、承認済みの方にも通知されます。',
  },
  {
    keywords: ['パスワード', '忘れ', 'ログイン', 'できない'],
    question: 'パスワードを忘れた',
    answer:
      'ログイン画面の「パスワードを忘れた方はこちら」から、登録済みメールアドレスを入力してください。再設定用のリンクがメールで届きます。',
  },
  {
    keywords: ['現場パスワード', '現場', 'サイト'],
    question: '現場パスワードとは',
    answer:
      '現場パスワードは工事現場ごとに設定されたパスワードで、請求書作成時に必要です。平野工務店の担当者（現場監督または経理）から受け取ってください。第三者には教えないでください。',
    forUserType: 'customer',
  },
  {
    keywords: ['ステータス', '状態', '今どう', '確認'],
    question: '請求書のステータス確認',
    answer:
      '【ステータスの意味】\n・下書き：未提出（提出ボタンで提出してください）\n・提出済み／承認待ち：審査中です\n・承認済み：支払い待ちです\n・差し戻し：対応が必要です\n・支払済み：完了\n\n「請求書一覧」から各請求書のステータスを確認できます。',
  },
  {
    keywords: ['ユーザー', '追加', 'アカウント', '登録'],
    question: 'ユーザーの追加方法',
    answer:
      '【社内ユーザーの追加（経理・管理者のみ）】\n1. 管理メニュー →「ユーザー管理」\n2. 「＋新規ユーザー」をクリック\n3. 種別・氏名・メール・役職・パスワードを入力\n\n【協力会社の方】\nログイン画面の「新規登録」から申請してください。経理の承認後に利用開始できます。',
  },
  {
    keywords: ['支払', '振込', 'いつ', '金額'],
    question: '支払いについて',
    answer:
      '承認が完了した請求書は支払い処理に進みます。支払予定日は「支払いカレンダー」で確認できます。請求額が10万円以上の場合、安全衛生協力会費（請求額の3/1000）が差し引かれます。',
  },
  {
    keywords: ['PDF', '印刷', 'ダウンロード'],
    question: 'PDF出力・印刷',
    answer:
      '請求書詳細画面の「PDF出力」ボタンから出力できます。\n※PDF出力は経理担当者・管理者のみ利用可能です。',
    forUserType: 'internal',
  },
  {
    keywords: ['赤ペン', '修正機能', '金額修正'],
    question: '赤ペン修正機能（経理向け)',
    answer:
      '【赤ペン修正の手順（経理のみ）】\n1. 請求書詳細で「修正」ボタンをクリック\n2. 金額・数量・品名を修正し、修正理由を入力\n3. 協力会社に自動で差し戻し通知が送信されます\n4. 協力会社が修正内容を承認すると、承認フローが再開します\n\n※修正可能期間は受領から2日以内です。',
    forUserType: 'internal',
  },
];

const HelpChatbot: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleFaq = FAQ.filter(
    (f) => !f.forUserType || f.forUserType === user?.user_type
  );

  const initialMessage: ChatMessage = {
    role: 'bot',
    text: 'こんにちは！使い方サポートです。\n下の質問をタップするか、キーワードを入力してください。',
    options: visibleFaq.slice(0, 6).map((f) => f.question),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const findAnswer = (query: string): FaqEntry | null => {
    const q = query.toLowerCase();
    let best: { entry: FaqEntry; score: number } | null = null;
    for (const entry of visibleFaq) {
      // 完全一致（選択肢クリック）
      if (entry.question === query) return entry;
      const score = entry.keywords.filter((k) => q.includes(k.toLowerCase())).length;
      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
    return best?.entry || null;
  };

  const handleSend = (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;

    const userMsg: ChatMessage = { role: 'user', text: query };
    const match = findAnswer(query);

    const botMsg: ChatMessage = match
      ? {
          role: 'bot',
          text: match.answer,
          options: ['他の質問を見る'],
        }
      : {
          role: 'bot',
          text: '申し訳ありません、その質問にはお答えできませんでした。\n下の質問から選ぶか、別のキーワードでお試しください。\n\n解決しない場合はKEYRON担当者までお問い合わせください。',
          options: visibleFaq.slice(0, 6).map((f) => f.question),
        };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleOption = (option: string) => {
    if (option === '他の質問を見る') {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'よくある質問はこちらです。',
          options: visibleFaq.map((f) => f.question),
        },
      ]);
      return;
    }
    handleSend(option);
  };

  const handleReset = () => {
    setMessages([initialMessage]);
  };

  return (
    <>
      {/* フローティングボタン */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 hover:scale-105 transition-all flex items-center justify-center"
          aria-label="使い方サポートを開く"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* チャットウィンドウ */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-bold text-sm">使い方サポート</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="最初からやり直す"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="閉じる"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-auto bg-primary-600 text-white rounded-br-md'
                      : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOption(opt)}
                        className="text-xs px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-full hover:bg-primary-50 transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend();
                }}
                placeholder="キーワードを入力（例: 提出できない）"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
                aria-label="送信"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpChatbot;
