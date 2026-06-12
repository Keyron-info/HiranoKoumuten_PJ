# invoices/chatbot_views.py
# AIヘルプチャットボット（Claude API使用）

import os

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .chatbot_knowledge import SYSTEM_KNOWLEDGE

# 会話履歴の最大件数（コンテキスト肥大防止）
MAX_HISTORY_MESSAGES = 10
# 1メッセージの最大文字数
MAX_MESSAGE_LENGTH = 1000

CHATBOT_MODEL = os.environ.get('CHATBOT_MODEL', 'claude-haiku-4-5-20251001')


class ChatbotAskView(APIView):
    """
    AIヘルプチャットボット

    POST /api/chatbot/ask/
    body: { "message": "質問", "history": [{"role": "user"|"assistant", "text": "..."}] }

    ANTHROPIC_API_KEY が未設定の場合は 503 を返し、
    フロントエンドはルールベースFAQにフォールバックする。
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return Response(
                {'error': 'AIチャットボットは現在利用できません', 'fallback': True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        user_message = (request.data.get('message') or '').strip()
        if not user_message:
            return Response(
                {'error': 'メッセージを入力してください'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(user_message) > MAX_MESSAGE_LENGTH:
            return Response(
                {'error': f'メッセージは{MAX_MESSAGE_LENGTH}文字以内で入力してください'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 会話履歴の組み立て（最新N件のみ・形式検証）
        messages = []
        history = request.data.get('history') or []
        if isinstance(history, list):
            for item in history[-MAX_HISTORY_MESSAGES:]:
                role = item.get('role')
                text = (item.get('text') or '').strip()[:MAX_MESSAGE_LENGTH]
                if role in ('user', 'assistant') and text:
                    messages.append({'role': role, 'content': text})
        messages.append({'role': 'user', 'content': user_message})

        # ユーザーコンテキスト（種別・役職に応じた回答のため）
        user = request.user
        user_context = (
            f"質問者の情報: ユーザー種別={'社内ユーザー' if user.user_type == 'internal' else '協力会社ユーザー'}"
        )
        if user.user_type == 'internal' and getattr(user, 'position', ''):
            user_context += f"、役職={user.get_position_display()}"

        system_blocks = [
            {
                # ナレッジ本体は不変なのでキャッシュ対象にする
                'type': 'text',
                'text': (
                    'あなたは「平野工務店 請求書管理システム」の使い方サポートAIです。'
                    '以下のシステムガイドの内容に基づいて、日本語で簡潔・正確に回答してください。\n\n'
                    '回答ルール:\n'
                    '- ガイドに書かれていないことは推測せず「わかりかねます。経理担当者またはKEYRONにお問い合わせください」と案内する\n'
                    '- 操作手順は番号付きリストで示す\n'
                    '- 質問者の権限で使えない機能を聞かれた場合は、その旨を伝える\n'
                    '- システムと無関係の質問（雑談・一般知識・他社製品など）には回答せず、システムの使い方について質問するよう促す\n\n'
                    + SYSTEM_KNOWLEDGE
                ),
                'cache_control': {'type': 'ephemeral'},
            },
            {
                'type': 'text',
                'text': user_context,
            },
        ]

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=CHATBOT_MODEL,
                max_tokens=1024,
                system=system_blocks,
                messages=messages,
            )
            answer = ''.join(
                block.text for block in response.content if block.type == 'text'
            )
            return Response({'answer': answer})

        except ImportError as e:
            import sys
            print(f'[chatbot] ImportError: {e}', file=sys.stderr, flush=True)
            return Response(
                {'error': 'AIチャットボットは現在利用できません', 'fallback': True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            # APIエラー時もフォールバック可能なことをフロントに伝える
            import sys
            import traceback
            print(f'[chatbot] Claude API error: {type(e).__name__}: {e}', file=sys.stderr, flush=True)
            traceback.print_exc(file=sys.stderr)
            sys.stderr.flush()
            return Response(
                {'error': 'AIチャットボットが一時的に応答できません', 'fallback': True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
