import React from 'react';
import { useNavigate } from 'react-router-dom';

interface InvoiceSuccessModalProps {
    invoiceNumber: string;
    onClose: () => void;
    onViewDetails: () => void;
}

const InvoiceSuccessModal: React.FC<InvoiceSuccessModalProps> = ({ invoiceNumber, onClose, onViewDetails }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {/* Top Orange Accent */}
                <div className="h-4 bg-orange-500 w-full" />

                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className="mx-auto w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">請求書作成完了</h2>

                    <p className="text-gray-600 mb-8">
                        請求書番号: <span className="font-medium text-orange-600">{invoiceNumber}</span> が正常に作成されました。
                        <br />
                        作成お疲れ様でした！
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onViewDetails}
                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-md flex items-center justify-center gap-2"
                        >
                            請求書を表示
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white border-2 border-orange-100 text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceSuccessModal;
