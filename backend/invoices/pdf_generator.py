# ==========================================
# Phase 2: PDF生成機能
# ==========================================
# backend/invoices/pdf_generator.py として新規作成してください

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from django.conf import settings
import io
from datetime import datetime


def generate_invoice_pdf(invoice):
    """
    請求書PDFを生成
    
    Args:
        invoice: Invoiceモデルインスタンス
    
    Returns:
        io.BytesIO: PDF データ
    """
    buffer = io.BytesIO()
    
    # PDFドキュメント作成
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    # ストーリー（コンテンツ）
    story = []
    
    # スタイル定義
    styles = getSampleStyleSheet()
    
    # カスタムスタイル
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a56db'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=12
    )
    
    # ==========================================
    # 1. タイトル
    # ==========================================
    title = Paragraph("請求書", title_style)
    story.append(title)
    story.append(Spacer(1, 10*mm))
    
    # ==========================================
    # 2. 請求書情報ヘッダー
    # ==========================================
    header_data = [
        ['請求書番号:', invoice.invoice_number],
        ['発行日:', invoice.invoice_date.strftime('%Y年%m月%d日') if invoice.invoice_date else ''],
        ['支払期限:', invoice.payment_due_date.strftime('%Y年%m月%d日') if invoice.payment_due_date else ''],
    ]
    
    header_table = Table(header_data, colWidths=[40*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 10*mm))
    
    # ==========================================
    # 3. 宛先・差出人情報
    # ==========================================
    company_data = [
        ['【宛先】', '【差出人】'],
        [
            f"{invoice.receiving_company.name}\n{invoice.receiving_company.address}",
            f"{invoice.customer_company.name}\n{invoice.customer_company.address}\n"
            f"担当: {invoice.created_by.get_full_name() if invoice.created_by else ''}"
        ]
    ]
    
    company_table = Table(company_data, colWidths=[85*mm, 85*mm])
    company_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 11),
        ('FONT', (0, 1), (-1, 1), 'Helvetica', 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BOX', (0, 0), (0, -1), 1, colors.grey),
        ('BOX', (1, 0), (1, -1), 1, colors.grey),
    ]))
    
    story.append(company_table)
    story.append(Spacer(1, 10*mm))
    
    # ==========================================
    # 4. 工事現場情報
    # ==========================================
    if invoice.construction_site:
        site_info = Paragraph(
            f"<b>工事現場:</b> {invoice.construction_site.name} ({invoice.construction_site.location})",
            header_style
        )
        story.append(site_info)
        story.append(Spacer(1, 5*mm))
    
    # ==========================================
    # 5. 請求明細テーブル
    # ==========================================
    # ヘッダー
    item_data = [
        ['No.', '品目・作業内容', '数量', '単位', '単価', '金額']
    ]
    
    # 明細行
    for idx, item in enumerate(invoice.items.all(), start=1):
        item_data.append([
            str(idx),
            item.description,
            f"{item.quantity:,.0f}" if item.quantity else '',
            item.unit or '',
            f"¥{item.unit_price:,.0f}" if item.unit_price else '',
            f"¥{item.amount:,.0f}" if item.amount else ''
        ])
    
    # 空行追加（最低5行）
    while len(item_data) < 6:
        item_data.append(['', '', '', '', '', ''])
    
    # 小計・税・合計
    item_data.extend([
        ['', '', '', '', '小計', f"¥{invoice.subtotal:,.0f}"],
        ['', '', '', '', f'消費税 ({invoice.tax_rate}%)', f"¥{invoice.tax_amount:,.0f}"],
        ['', '', '', '', '合計金額', f"¥{invoice.total_amount:,.0f}"]
    ])
    
    item_table = Table(
        item_data,
        colWidths=[10*mm, 70*mm, 20*mm, 15*mm, 25*mm, 30*mm]
    )
    
    item_table.setStyle(TableStyle([
        # ヘッダー
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # データ行
        ('FONT', (0, 1), (-1, -4), 'Helvetica', 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # 小計・税・合計
        ('FONT', (4, -3), (-1, -1), 'Helvetica-Bold', 11),
        ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#f0f0f0')),
        
        # グリッド
        ('GRID', (0, 0), (-1, -4), 0.5, colors.grey),
        ('LINEABOVE', (4, -3), (-1, -3), 1, colors.grey),
        ('LINEABOVE', (4, -1), (-1, -1), 2, colors.black),
        
        # パディング
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(item_table)
    story.append(Spacer(1, 10*mm))
    
    # ==========================================
    # 6. 備考
    # ==========================================
    if invoice.notes:
        notes_style = ParagraphStyle(
            'Notes',
            parent=styles['Normal'],
            fontSize=9,
            leftIndent=10,
            spaceAfter=5
        )
        notes_title = Paragraph("<b>備考:</b>", header_style)
        story.append(notes_title)
        notes_content = Paragraph(invoice.notes.replace('\n', '<br/>'), notes_style)
        story.append(notes_content)
        story.append(Spacer(1, 5*mm))
    
    # ==========================================
    # 7. フッター
    # ==========================================
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    
    footer_text = f"発行日: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}"
    if invoice.template:
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
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    
    story = []
    styles = getSampleStyleSheet()
    
    # タイトル
    title = Paragraph(f"請求書 {invoice.invoice_number}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 20))
    
    # 基本情報
    info_text = f"""
    <b>発行日:</b> {invoice.invoice_date}<br/>
    <b>支払期限:</b> {invoice.payment_due_date}<br/>
    <b>宛先:</b> {invoice.receiving_company.name}<br/>
    <b>差出人:</b> {invoice.customer_company.name}<br/>
    <b>合計金額:</b> ¥{invoice.total_amount:,}
    """
    info = Paragraph(info_text, styles['Normal'])
    story.append(info)
    
    doc.build(story)
    buffer.seek(0)
    return buffer