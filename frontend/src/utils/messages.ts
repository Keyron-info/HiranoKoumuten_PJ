// frontend/src/utils/messages.ts
/**
 * ポジティブメッセージング対応
 * 
 * 基本方針: 「不要な不安を煽らない」
 * - エラーメッセージは優しく、次のアクションを提示
 * - 成功メッセージは具体的に
 */

export const MESSAGES = {
  // ==========================================
  // 成功メッセージ
  // ==========================================
  SUCCESS: {
    INVOICE_CREATED: '請求書を作成しました',
    INVOICE_SUBMITTED: '請求書を提出しました。承認をお待ちください。',
    INVOICE_APPROVED: '承認が完了しました',
    INVOICE_SAVED: '変更を保存しました',
    BATCH_APPROVED: (count: number) => `${count}件の請求書を承認しました`,
    CORRECTION_ADDED: '修正内容を追加しました',
    CORRECTION_APPROVED: '修正内容を承認しました。ありがとうございます。',
    PERIOD_CLOSED: '締め処理が完了しました',
    SITE_COMPLETED: '現場を完成状態にしました',
    SITE_CUTOFF: '打ち切り処理が完了しました',
  },

  // ==========================================
  // 情報メッセージ
  // ==========================================
  INFO: {
    DEADLINE_APPROACHING: (days: number) => 
      `提出期限まであと${days}日です。お早めにご提出ください。`,
    BUDGET_STATUS: (rate: number) => 
      rate >= 90 
        ? `予算消化率が${rate}%に達しています。ご確認ください。`
        : `予算消化率: ${rate}%`,
    CORRECTION_REQUESTED: '修正が依頼されています。内容をご確認ください。',
    PENDING_APPROVAL: (count: number) => 
      count > 0 
        ? `${count}件の承認待ちがあります`
        : '現在、承認待ちの請求書はありません',
  },

  // ==========================================
  // エラーメッセージ（ポジティブに変換）
  // ==========================================
  ERROR: {
    // 期限関連
    DEADLINE_PASSED: (deadline: string) => 
      `申し訳ございませんが、提出期限（${deadline}）を過ぎたため、本請求書は提出できません。\n経理部門までお問い合わせください。`,
    NOT_YET_OPEN: (startDate: string) => 
      `提出期間は${startDate}からです。\n今しばらくお待ちください。`,
    PERIOD_CLOSED: 
      'この期間は既に締め処理が完了しています。\n経理部門までお問い合わせください。',
    
    // 権限関連
    NO_DOWNLOAD_PERMISSION: 
      'PDFダウンロード権限がありません。\n経理部門にお問い合わせください。',
    NO_EDIT_PERMISSION: 
      'この請求書を編集する権限がありません。',
    CORRECTION_PERIOD_EXPIRED: 
      '訂正期限を過ぎています。\n変更が必要な場合は経理部門にお問い合わせください。',
    
    // 現場関連
    SITE_COMPLETED: 
      'この現場は完成済みのため、新規請求書を作成できません。',
    SITE_CUTOFF: 
      'この現場は打ち切り済みのため、新規請求書を作成できません。',
    
    // 承認関連
    ADDITIONAL_APPROVAL_REQUIRED: 
      '承認には追加の確認が必要です。\n常務まで確認をお願いいたします。',
    ALREADY_APPROVED: 
      'この請求書は既に承認済みです。',
    
    // 一般的なエラー
    NETWORK_ERROR: 
      '通信エラーが発生しました。\nもう一度お試しください。',
    VALIDATION_ERROR: 
      '入力内容をご確認ください。',
    UNEXPECTED_ERROR: 
      '予期せぬエラーが発生しました。\nしばらく経ってからもう一度お試しください。',
  },

  // ==========================================
  // 確認メッセージ
  // ==========================================
  CONFIRM: {
    SUBMIT_INVOICE: '請求書を提出しますか？\n提出後は編集できなくなります。',
    APPROVE_INVOICE: 'この請求書を承認しますか？',
    REJECT_INVOICE: 'この請求書を却下しますか？\n理由を入力してください。',
    RETURN_INVOICE: '差し戻しを行いますか？\n修正理由を入力してください。',
    BATCH_APPROVE: (count: number) => 
      `${count}件の請求書を一括承認しますか？`,
    SITE_CUTOFF: '打ち切りを行いますか？\n打ち切り後は新規請求書を作成できなくなります。',
    DELETE_ITEM: '削除してもよろしいですか？',
  },

  // ==========================================
  // ステータス表示
  // ==========================================
  STATUS: {
    draft: '下書き',
    submitted: '提出済み',
    pending_approval: '承認待ち',
    pending_batch_approval: '一斉承認待ち',
    approved: '承認済み',
    rejected: '却下',
    returned: '差し戻し',
    payment_preparing: '支払い準備中',
    paid: '支払い済み',
  },

  // ==========================================
  // リスクレベル表示
  // ==========================================
  RISK: {
    critical: {
      label: '要注意',
      color: '#E53935',
      description: '予算を超過しています',
    },
    high: {
      label: '警告',
      color: '#FF6B35',
      description: '予算消化率が90%以上です',
    },
    medium: {
      label: '注意',
      color: '#FFC107',
      description: '予算消化率が70%以上です',
    },
    low: {
      label: '正常',
      color: '#4CAF50',
      description: '予算内で推移しています',
    },
  },
};

/**
 * エラーメッセージをポジティブに変換するヘルパー
 */
export const formatErrorMessage = (error: string | { error?: string; detail?: string }): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  const message = error.error || error.detail || MESSAGES.ERROR.UNEXPECTED_ERROR;
  return message;
};

/**
 * 日付をフォーマット
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * 金額をフォーマット
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `¥${num.toLocaleString('ja-JP')}`;
};

export default MESSAGES;

