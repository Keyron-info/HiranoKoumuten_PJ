# ==========================================
# Phase 2: PDF生成機能（日本語対応版）
# ==========================================

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from django.conf import settings
import io
import os
from datetime import datetime


def register_japanese_fonts():
    """日本語フォントを登録"""
    # CIDフォント（ReportLabビルトイン - 常に使用可能）
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
        return 'HeiseiKakuGo-W5', 'HeiseiKakuGo-W5'
    except Exception as e:
        print(f"CIDFont登録エラー: {e}")
    
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
        return 'HeiseiMin-W3', 'HeiseiMin-W3'
    except Exception as e:
        print(f"CIDFont登録エラー2: {e}")
    
    # macOS標準フォント
    mac_fonts = [
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    ]
    
    for font_path in mac_fonts:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('JapaneseGothic', font_path, subfontIndex=0))
                return 'JapaneseGothic', 'JapaneseGothic'
            except Exception as e:
                print(f"macOSフォント登録エラー ({font_path}): {e}")
                continue
    
    # Linux標準フォント
    linux_fonts = [
        '/usr/share/fonts/truetype/takao-gothic/TakaoGothic.ttf',
        '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
    ]
    
    for font_path in linux_fonts:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('JapaneseGothic', font_path))
                return 'JapaneseGothic', 'JapaneseGothic'
            except Exception as e:
                print(f"Linuxフォント登録エラー ({font_path}): {e}")
                continue
    
    # フォントがない場合はHelveticaを使用（日本語は文字化けする可能性）
    print("警告: 日本語フォントが見つかりません。Helveticaを使用します。")
    return 'Helvetica', 'Helvetica'


def generate_invoice_pdf(invoice):
    """
    請求書PDFを生成
    
    Args:
        invoice: Invoiceモデルインスタンス
    
    Returns:
        io.BytesIO: PDF データ
    """
    buffer = io.BytesIO()
    
    # 日本語フォント登録
    font_gothic, font_mincho = register_japanese_fonts()
    
    # PDFドキュメント作成
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    # ストーリー（コンテンツ）
    story = []
    
    # スタイル定義
    styles = getSampleStyleSheet()
    
    # カスタムスタイル（日本語フォント使用）
    title_style = ParagraphStyle(
        'CustomTitle',
        fontName=font_gothic,
        fontSize=24,
        textColor=colors.HexColor('#1a56db'),
        spaceAfter=20,
        alignment=TA_CENTER,
        leading=30
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        fontName=font_gothic,
        fontSize=11,
        spaceAfter=8,
        leading=14
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        fontName=font_gothic,
        fontSize=9,
        leading=12
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        fontName=font_gothic,
        fontSize=8,
        leading=10
    )
    
    # ==========================================
    # 1. タイトル
    # ==========================================
    title = Paragraph("請 求 書", title_style)
    story.append(title)
    story.append(Spacer(1, 8*mm))
    
    # ==========================================
    # 2. 請求書情報ヘッダー
    # ==========================================
    invoice_number = invoice.invoice_number or ''
    invoice_date = invoice.invoice_date.strftime('%Y年%m月%d日') if invoice.invoice_date else ''
    payment_due = invoice.payment_due_date.strftime('%Y年%m月%d日') if invoice.payment_due_date else ''
    
    header_data = [
        ['請求書番号:', str(invoice_number)],
        ['発行日:', invoice_date],
        ['支払期限:', payment_due],
    ]
    
    header_table = Table(header_data, colWidths=[35*mm, 70*mm])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font_gothic),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), font_gothic),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 8*mm))
    
    # ==========================================
    # 3. 宛先・差出人情報
    # ==========================================
    receiving_name = invoice.receiving_company.name if invoice.receiving_company else ''
    receiving_address = invoice.receiving_company.address if invoice.receiving_company else ''
    customer_name = invoice.customer_company.name if invoice.customer_company else ''
    customer_address = invoice.customer_company.address if invoice.customer_company else ''
    created_by_name = invoice.created_by.get_full_name() if invoice.created_by else ''
    
    # 宛先と差出人を2カラムで表示
    company_data = [
        [
            Paragraph(f"<b>【 宛 先 】</b>", header_style),
            Paragraph(f"<b>【 差 出 人 】</b>", header_style)
        ],
        [
            Paragraph(f"{receiving_name}<br/>{receiving_address}", normal_style),
            Paragraph(f"{customer_name}<br/>{customer_address}<br/>担当: {created_by_name}", normal_style)
        ]
    ]
    
    company_table = Table(company_data, colWidths=[85*mm, 85*mm])
    company_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font_gothic),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BOX', (0, 0), (0, -1), 0.5, colors.grey),
        ('BOX', (1, 0), (1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8f9fa')),
    ]))
    
    story.append(company_table)
    story.append(Spacer(1, 6*mm))
    
    # ==========================================
    # 4. 工事現場情報
    # ==========================================
    if invoice.construction_site:
        site_name = invoice.construction_site.name or ''
        site_location = invoice.construction_site.location or ''
        site_info = Paragraph(
            f"<b>工事現場:</b> {site_name} ({site_location})",
            header_style
        )
        story.append(site_info)
        story.append(Spacer(1, 4*mm))
    
    # 工種情報
    if hasattr(invoice, 'construction_type') and invoice.construction_type:
        type_info = Paragraph(
            f"<b>工種:</b> {invoice.construction_type.name}",
            header_style
        )
        story.append(type_info)
        story.append(Spacer(1, 4*mm))
    
    # ==========================================
    # 5. 合計金額（大きく表示）
    # ==========================================
    total_amount = invoice.total_amount or 0
    total_display = f"¥{int(total_amount):,}"
    
    total_style = ParagraphStyle(
        'TotalAmount',
        fontName=font_gothic,
        fontSize=20,
        textColor=colors.HexColor('#1a56db'),
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    total_box_data = [[Paragraph(f"ご請求金額: {total_display}", total_style)]]
    total_box = Table(total_box_data, colWidths=[170*mm])
    total_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#1a56db')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f5ff')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(total_box)
    story.append(Spacer(1, 6*mm))
    
    # ==========================================
    # 6. 請求明細テーブル
    # ==========================================
    # ヘッダー
    item_data = [
        ['No.', '品目・作業内容', '数量', '単位', '単価', '金額']
    ]
    
    # 明細行
    items = invoice.items.all() if hasattr(invoice, 'items') else []
    for idx, item in enumerate(items, start=1):
        quantity = f"{item.quantity:,.0f}" if item.quantity else ''
        unit = item.unit or ''
        unit_price = f"¥{int(item.unit_price):,}" if item.unit_price else ''
        amount = f"¥{int(item.amount):,}" if item.amount else ''
        description = item.description or ''
        
        # 長い説明は折り返す
        if len(description) > 30:
            description = Paragraph(description, small_style)
        
        item_data.append([
            str(idx),
            description,
            quantity,
            unit,
            unit_price,
            amount
        ])
    
    # 空行追加（最低5行）
    while len(item_data) < 6:
        item_data.append(['', '', '', '', '', ''])
    
    # 小計・税・合計
    subtotal = invoice.subtotal or 0
    tax_amount = invoice.tax_amount or 0
    
    item_data.extend([
        ['', '', '', '', '小計', f"¥{int(subtotal):,}"],
        ['', '', '', '', '消費税 (10%)', f"¥{int(tax_amount):,}"],
        ['', '', '', '', '合計金額', f"¥{int(total_amount):,}"]
    ])
    
    # 安全衛生協力会費がある場合
    if hasattr(invoice, 'safety_cooperation_fee') and invoice.safety_cooperation_fee:
        safety_fee = invoice.safety_cooperation_fee
        net_amount = total_amount - safety_fee
        item_data.append(['', '', '', '', '安全衛生協力会費', f"¥{int(safety_fee):,}"])
        item_data.append(['', '', '', '', '差引支払額', f"¥{int(net_amount):,}"])
    
    item_table = Table(
        item_data,
        colWidths=[10*mm, 70*mm, 20*mm, 15*mm, 25*mm, 30*mm]
    )
    
    # 明細の最後の行番号を計算
    last_data_row = len(item_data) - 3  # 小計・税・合計の前
    if hasattr(invoice, 'safety_cooperation_fee') and invoice.safety_cooperation_fee:
        last_data_row = len(item_data) - 5
    
    item_table.setStyle(TableStyle([
        # ヘッダー
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), font_gothic),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # データ行
        ('FONTNAME', (0, 1), (-1, -1), font_gothic),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # 小計・税・合計
        ('FONTNAME', (4, -3), (-1, -1), font_gothic),
        ('FONTSIZE', (4, -3), (-1, -1), 10),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#e8f0fe')),
        ('TEXTCOLOR', (5, -1), (5, -1), colors.HexColor('#1a56db')),
        
        # グリッド
        ('GRID', (0, 0), (-1, last_data_row), 0.5, colors.grey),
        ('LINEABOVE', (4, -3), (-1, -3), 1, colors.grey),
        ('LINEABOVE', (4, -1), (-1, -1), 2, colors.HexColor('#1a56db')),
        
        # パディング
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    story.append(item_table)
    story.append(Spacer(1, 8*mm))
    
    # ==========================================
    # 7. 振込先情報
    # ==========================================
    if invoice.customer_company and hasattr(invoice.customer_company, 'bank_info') and invoice.customer_company.bank_info:
        bank_style = ParagraphStyle(
            'BankInfo',
            fontName=font_gothic,
            fontSize=9,
            leading=12
        )
        bank_info_text = f"<b>お振込先:</b><br/>{invoice.customer_company.bank_info}"
        bank_info = Paragraph(bank_info_text, bank_style)
        story.append(bank_info)
        story.append(Spacer(1, 5*mm))
    
    # ==========================================
    # 8. 備考
    # ==========================================
    if invoice.notes:
        notes_style = ParagraphStyle(
            'Notes',
            fontName=font_gothic,
            fontSize=9,
            leftIndent=10,
            spaceAfter=5,
            leading=12
        )
        notes_title = Paragraph("<b>備考:</b>", header_style)
        story.append(notes_title)
        notes_content = Paragraph(str(invoice.notes).replace('\n', '<br/>'), notes_style)
        story.append(notes_content)
        story.append(Spacer(1, 5*mm))
    
    # ==========================================
    # 9. フッター
    # ==========================================
    footer_style = ParagraphStyle(
        'Footer',
        fontName=font_gothic,
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    
    footer_text = f"発行日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}"
    if hasattr(invoice, 'template') and invoice.template:
        footer_text += f" | テンプレート: {invoice.template.name}"
    
    footer = Paragraph(footer_text, footer_style)
    story.append(Spacer(1, 5*mm))
    story.append(footer)
    
    # ==========================================
    # PDF生成
    # ==========================================
    doc.build(story)
    
    buffer.seek(0)
    return buffer


def generate_invoice_pdf_simple(invoice):
    """
    シンプル版PDF生成（デバッグ用）
    """
    buffer = io.BytesIO()
    
    font_gothic, _ = register_japanese_fonts()
    
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    
    story = []
    
    title_style = ParagraphStyle(
        'Title',
        fontName=font_gothic,
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        fontName=font_gothic,
        fontSize=10,
        leading=14
    )
    
    # タイトル
    invoice_number = invoice.invoice_number or ''
    title = Paragraph(f"請求書 {invoice_number}", title_style)
    story.append(title)
    story.append(Spacer(1, 20))
    
    # 基本情報
    invoice_date = str(invoice.invoice_date) if invoice.invoice_date else ''
    payment_due = str(invoice.payment_due_date) if invoice.payment_due_date else ''
    receiving_name = invoice.receiving_company.name if invoice.receiving_company else ''
    customer_name = invoice.customer_company.name if invoice.customer_company else ''
    total_amount = int(invoice.total_amount) if invoice.total_amount else 0
    
    info_text = f"""
    <b>発行日:</b> {invoice_date}<br/>
    <b>支払期限:</b> {payment_due}<br/>
    <b>宛先:</b> {receiving_name}<br/>
    <b>差出人:</b> {customer_name}<br/>
    <b>合計金額:</b> ¥{total_amount:,}
    """
    info = Paragraph(info_text, normal_style)
    story.append(info)
    
    doc.build(story)
    buffer.seek(0)
    return buffer
