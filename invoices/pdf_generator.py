# ==========================================
# PDF生成機能（kbtemplate形式・日本語対応版）
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
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
        return 'HeiseiKakuGo-W5'
    except Exception:
        pass

    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
        return 'HeiseiMin-W3'
    except Exception:
        pass

    linux_fonts = [
        '/usr/share/fonts/truetype/takao-gothic/TakaoGothic.ttf',
        '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
    ]
    for path in linux_fonts:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('JapaneseGothic', path))
                return 'JapaneseGothic'
            except Exception:
                continue

    mac_fonts = [
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
    ]
    for path in mac_fonts:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('JapaneseGothic', path, subfontIndex=0))
                return 'JapaneseGothic'
            except Exception:
                continue

    return 'Helvetica'


# ------------------------------------------------------------------ #
#  カラーパレット                                                       #
# ------------------------------------------------------------------ #
BLUE      = colors.HexColor('#1E40AF')   # メインブルー
LT_BLUE   = colors.HexColor('#EFF6FF')   # 薄青（金額ボックス背景）
GRAY_LINE = colors.HexColor('#D1D5DB')   # テーブル罫線
LT_GRAY   = colors.HexColor('#F9FAFB')   # 偶数行背景


def _st(font, size=9, align=TA_LEFT, color=colors.black, leading=None, bold=False):
    """ParagraphStyle ショートカット"""
    import uuid
    return ParagraphStyle(
        f'_s_{uuid.uuid4().hex[:6]}',
        fontName=font,
        fontSize=size,
        alignment=align,
        textColor=color,
        leading=leading or max(size * 1.45, size + 3),
    )


def generate_invoice_pdf(invoice):
    """
    請求書PDFをkbtemplate形式で生成。

    Args:
        invoice: Invoice モデルインスタンス
    Returns:
        io.BytesIO: PDF データ
    """
    buffer = io.BytesIO()
    F = register_japanese_fonts()   # フォント名

    CW = 180 * mm   # コンテンツ幅 (A4 - 左右 15mm×2)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    story = []

    # ------------------------------------------------------------------ #
    # データ準備                                                           #
    # ------------------------------------------------------------------ #
    recv = invoice.receiving_company    # 宛先 (発注会社)
    cust = invoice.customer_company     # 差出人 (協力会社)

    r_name      = recv.name           if recv else ''
    r_postal    = getattr(recv, 'postal_code', '') or ''
    r_addr      = recv.address        if recv else ''
    r_tel       = getattr(recv, 'phone', '') or ''

    c_name      = cust.name           if cust else ''
    c_postal    = getattr(cust, 'postal_code', '') or ''
    c_addr      = cust.address        if cust else ''
    c_tel       = getattr(cust, 'phone', '') or ''
    c_email     = getattr(cust, 'email', '') or ''
    c_bank      = getattr(cust, 'bank_name',   '') or ''
    c_branch    = getattr(cust, 'bank_branch', '') or ''
    c_account   = getattr(cust, 'bank_account','') or ''
    c_reg_no    = getattr(cust, 'invoice_registration_number', '') or ''
    c_kana      = getattr(cust, 'name_kana',   '') or c_name

    inv_no   = invoice.invoice_number or ''
    inv_date = invoice.invoice_date.strftime('%Y/%m/%d')  if invoice.invoice_date  else ''
    due_date = ''
    if getattr(invoice, 'payment_due_date', None):
        due_date = invoice.payment_due_date.strftime('%Y年%m月末')

    total    = int(invoice.total_amount  or 0)
    subtotal = int(invoice.subtotal      or 0)
    tax_amt  = int(invoice.tax_amount    or 0)

    items    = list(invoice.items.all()) if hasattr(invoice, 'items') else []

    # ================================================================== #
    # 1. タイトルバー「請求書」                                            #
    # ================================================================== #
    title_tbl = Table(
        [[Paragraph('請求書', _st(F, 18, TA_CENTER, colors.white))]],
        colWidths=[CW],
    )
    title_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))
    story.append(title_tbl)
    story.append(Spacer(1, 3 * mm))

    # ================================================================== #
    # 2. 宛先（左）＋ 発行情報・差出人（右）                              #
    # ================================================================== #

    # --- 金額ボックス ---
    amount_box = Table(
        [
            [Paragraph('ご請求金額（税込）', _st(F, 8, TA_CENTER, colors.white))],
            [Paragraph(f'¥{total:,}', _st(F, 18, TA_CENTER, BLUE))],
        ],
        colWidths=[85 * mm],
    )
    amount_box.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (0, 0), BLUE),
        ('BACKGROUND',    (0, 1), (0, 1), LT_BLUE),
        ('BOX',           (0, 0), (-1, -1), 1, BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))

    # 宛先住所
    recv_postal_line = f'〒{r_postal}' if r_postal else ''
    recv_lines = []
    if recv_postal_line:
        recv_lines.append(recv_postal_line)
    if r_addr:
        recv_lines.append(r_addr)

    # LEFT カラム内容（単一列テーブル）
    left_rows = [
        [Paragraph(f'<b>{r_name}　御中</b>', _st(F, 13))],
    ]
    if recv_lines:
        left_rows.append([Paragraph('<br/>'.join(recv_lines), _st(F, 8))])
    left_rows.append([Spacer(1, 2 * mm)])
    left_rows.append([Paragraph('下記の通り、ご請求申し上げます。', _st(F, 9))])
    left_rows.append([Spacer(1, 2 * mm)])
    left_rows.append([amount_box])

    left_inner = Table(left_rows, colWidths=[92 * mm])
    left_inner.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
    ]))

    # --- 差出人ボックス ---
    sender_rows = [[Paragraph(f'<b>{c_name}</b>', _st(F, 10, TA_RIGHT))]]
    if c_postal:
        sender_rows.append([Paragraph(f'〒{c_postal}', _st(F, 8, TA_RIGHT))])
    if c_addr:
        sender_rows.append([Paragraph(c_addr, _st(F, 8, TA_RIGHT))])
    if c_tel:
        sender_rows.append([Paragraph(f'電話　{c_tel}', _st(F, 8, TA_RIGHT))])
    if c_email:
        sender_rows.append([Paragraph(f'メール　{c_email}', _st(F, 8, TA_RIGHT))])

    sender_box = Table(sender_rows, colWidths=[80 * mm])
    sender_box.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.8, BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
    ]))

    # RIGHT カラム内容
    right_rows = [
        [Paragraph(f'発行日　　　{inv_date}', _st(F, 9, TA_RIGHT))],
        [Paragraph(f'請求書番号　{inv_no}',   _st(F, 9, TA_RIGHT))],
        [Spacer(1, 3 * mm)],
        [sender_box],
    ]
    if c_reg_no:
        right_rows.append([Paragraph(f'登録番号　{c_reg_no}', _st(F, 8, TA_RIGHT))])

    right_inner = Table(right_rows, colWidths=[88 * mm])
    right_inner.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))

    # 2カラム結合
    header_tbl = Table([[left_inner, right_inner]], colWidths=[92 * mm, 88 * mm])
    header_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 3 * mm))

    # ================================================================== #
    # 3. 振込先情報                                                        #
    # ================================================================== #
    if c_bank or c_account:
        bank_line = f'{c_bank}　{c_branch}　普通口座　{c_account}'.strip('　')
        bank_rows = []
        bank_rows.append([
            Paragraph('振込先', _st(F, 8, TA_CENTER, colors.white)),
            Paragraph(bank_line, _st(F, 9)),
        ])
        if c_kana:
            bank_rows.append([
                Paragraph('', _st(F, 8)),
                Paragraph(f'{c_kana}（カ）', _st(F, 9)),
            ])
        if due_date:
            bank_rows.append([
                Paragraph('振込期限', _st(F, 8, TA_CENTER, colors.white)),
                Paragraph(due_date, _st(F, 9)),
            ])
        bank_rows.append([
            Paragraph('', _st(F, 8)),
            Paragraph('振込手数料は御社のご負担にてお願いいたします。', _st(F, 8)),
        ])

        bank_tbl = Table(bank_rows, colWidths=[18 * mm, 162 * mm])
        bank_ts = [
            ('FONTNAME',      (0, 0), (-1, -1), F),
            ('FONTSIZE',      (0, 0), (-1, -1), 8),
            ('BACKGROUND',    (0, 0), (0, -1), BLUE),
            ('TEXTCOLOR',     (0, 0), (0, -1), colors.white),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING',   (0, 0), (0, -1), 3),
            ('LEFTPADDING',   (1, 0), (1, -1), 5),
            ('BOX',           (0, 0), (-1, -1), 0.5, BLUE),
            ('INNERGRID',     (0, 0), (-1, -1), 0.3, GRAY_LINE),
        ]
        bank_tbl.setStyle(TableStyle(bank_ts))
        story.append(bank_tbl)
        story.append(Spacer(1, 3 * mm))

    # ================================================================== #
    # 4. 明細テーブル                                                      #
    # ================================================================== #
    col_headers = ['日付', '内容', '減税\n対象', '数量', '単位', '単価（税抜）', '税率', '金額（税抜）']
    col_widths  = [20*mm, 62*mm, 10*mm, 14*mm, 10*mm, 24*mm, 10*mm, 30*mm]

    item_data = [col_headers]

    # 請求日（明細日付として使用）
    base_date = invoice.invoice_date.strftime('%Y/%m/%d') if invoice.invoice_date else ''

    for item in items:
        qty    = f'{float(item.quantity):g}'    if item.quantity  else ''
        uprice = f'¥{int(item.unit_price):,}'  if item.unit_price else ''
        amt    = f'¥{int(item.amount):,}'      if item.amount    else ''
        desc   = item.description or ''

        item_data.append([
            base_date,
            Paragraph(desc, _st(F, 8)) if len(desc) > 16 else desc,
            '',        # 減税対象（※）
            qty,
            item.unit or '式',
            uprice,
            '10%',
            amt,
        ])

    # 最低5行分確保
    min_rows = 7
    while len(item_data) < min_rows:
        item_data.append(['', '', '', '', '', '', '', ''])

    item_tbl = Table(item_data, colWidths=col_widths)

    last_data  = len(item_data) - 1
    item_style = [
        # ヘッダー行
        ('BACKGROUND',    (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, -1), F),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        # データ行
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('ALIGN',         (2, 1), (2, -1), 'CENTER'),  # 減税対象
        ('ALIGN',         (3, 1), (3, -1), 'RIGHT'),   # 数量
        ('ALIGN',         (5, 1), (5, -1), 'RIGHT'),   # 単価
        ('ALIGN',         (6, 1), (6, -1), 'CENTER'),  # 税率
        ('ALIGN',         (7, 1), (7, -1), 'RIGHT'),   # 金額
        # 罫線
        ('GRID',          (0, 0), (-1, last_data), 0.4, GRAY_LINE),
        # 交互背景
        ('ROWBACKGROUNDS',(0, 1), (-1, last_data), [colors.white, LT_GRAY]),
        # パディング
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
    ]
    item_tbl.setStyle(TableStyle(item_style))
    story.append(item_tbl)
    story.append(Spacer(1, 3 * mm))

    # ================================================================== #
    # 5. 税率区分（左）＋ 小計/消費税/合計（右）                          #
    # ================================================================== #

    # --- 左: 税率区分表 ---
    tax_note = Paragraph('※は軽減税率対象です。', _st(F, 7, color=colors.HexColor('#4B5563')))

    tax_breakdown_data = [
        [
            Paragraph('税率区分', _st(F, 7, TA_CENTER, colors.white)),
            Paragraph('消費税',   _st(F, 7, TA_CENTER, colors.white)),
            Paragraph('金額（税抜）', _st(F, 7, TA_CENTER, colors.white)),
        ],
        ['10%対象', f'¥{tax_amt:,}', f'¥{subtotal:,}'],
    ]
    tax_breakdown_tbl = Table(tax_breakdown_data, colWidths=[22*mm, 22*mm, 28*mm])
    tax_breakdown_tbl.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (-1, -1), F),
        ('FONTSIZE',      (0, 0), (-1, -1), 7),
        ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#6B7280')),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('ALIGN',         (1, 0), (2, -1), 'RIGHT'),
        ('ALIGN',         (0, 0), (0, -1), 'CENTER'),
        ('GRID',          (0, 0), (-1, -1), 0.3, GRAY_LINE),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
    ]))

    left_tax_inner = Table(
        [[tax_note], [Spacer(1, 1*mm)], [tax_breakdown_tbl]],
        colWidths=[75 * mm],
    )
    left_tax_inner.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))

    # --- 右: 小計/消費税/合計 ---
    totals_data = [
        ['小計',   f'¥{subtotal:,}'],
        ['消費税', f'¥{tax_amt:,}'],
        ['合計',   f'¥{total:,}'],
    ]
    totals_tbl = Table(totals_data, colWidths=[30*mm, 35*mm])
    totals_tbl.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (-1, -1), F),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('FONTSIZE',      (0, 2), (-1, 2), 10),
        ('ALIGN',         (0, 0), (0, -1), 'LEFT'),
        ('ALIGN',         (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.4, GRAY_LINE),
        ('BACKGROUND',    (0, 2), (-1, 2), LT_BLUE),
        ('TEXTCOLOR',     (1, 2), (1, 2), BLUE),
        ('LINEABOVE',     (0, 2), (-1, 2), 1.5, BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
    ]))

    right_totals_inner = Table(
        [[Spacer(1, 1)], [totals_tbl]],
        colWidths=[105 * mm],
        hAlign='RIGHT',
    )
    right_totals_inner.setStyle(TableStyle([
        ('ALIGN',         (0, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))

    bottom_tbl = Table(
        [[left_tax_inner, right_totals_inner]],
        colWidths=[75 * mm, 105 * mm],
    )
    bottom_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(bottom_tbl)
    story.append(Spacer(1, 4 * mm))

    # ================================================================== #
    # 6. 備考                                                              #
    # ================================================================== #
    notes_header = Table(
        [[Paragraph('備考', _st(F, 9, TA_LEFT, colors.white))]],
        colWidths=[CW],
    )
    notes_header.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
    ]))
    story.append(notes_header)

    notes_text = str(invoice.notes).replace('\n', '<br/>') if invoice.notes else ''
    notes_body_data = [[Paragraph(notes_text, _st(F, 8)) if notes_text else Spacer(1, 12*mm)]]
    notes_body = Table(notes_body_data, colWidths=[CW])
    notes_body.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.5, GRAY_LINE),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
    ]))
    story.append(notes_body)

    # ================================================================== #
    # PDF 生成                                                             #
    # ================================================================== #
    doc.build(story)
    buffer.seek(0)
    return buffer


# ------------------------------------------------------------------ #
# 一覧PDF（変更なし）                                                   #
# ------------------------------------------------------------------ #
def generate_invoice_list_pdf(invoices):
    """請求書一覧を表形式のPDFで出力する（経理向け帳票）。"""
    F = register_japanese_fonts()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=15 * mm, bottomMargin=15 * mm,
        leftMargin=12 * mm, rightMargin=12 * mm,
    )
    story = []

    from reportlab.lib.enums import TA_LEFT
    title_style = ParagraphStyle('ListTitle', fontName=F, fontSize=14, leading=18, alignment=TA_LEFT)
    meta_style  = ParagraphStyle('ListMeta',  fontName=F, fontSize=9,  leading=12, textColor=colors.grey)
    story.append(Paragraph('請求書一覧', title_style))
    story.append(Paragraph(
        f'出力日時: {datetime.now().strftime("%Y/%m/%d %H:%M")}　件数: {len(invoices)}件',
        meta_style,
    ))
    story.append(Spacer(1, 4 * mm))

    header = ['請求書番号', '協力会社', '工事現場', '請求日', '合計金額', 'ステータス']
    data   = [header]
    total_sum = 0
    for inv in invoices:
        amount = int(inv.total_amount or 0)
        total_sum += amount
        data.append([
            inv.invoice_number or '',
            (inv.customer_company.name if inv.customer_company else '')[:18],
            (inv.construction_site.name if inv.construction_site
             else (inv.construction_site_name or ''))[:16],
            inv.invoice_date.strftime('%Y/%m/%d') if inv.invoice_date else '',
            f'¥{amount:,}',
            inv.get_status_display(),
        ])
    data.append(['', '', '', '合計', f'¥{total_sum:,}', ''])

    col_widths = [32*mm, 38*mm, 34*mm, 24*mm, 30*mm, 22*mm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME',       (0, 0), (-1, -1), F),
        ('FONTSIZE',       (0, 0), (-1, -1), 8),
        ('BACKGROUND',     (0, 0), (-1, 0),  colors.HexColor('#2F5496')),
        ('TEXTCOLOR',      (0, 0), (-1, 0),  colors.white),
        ('ALIGN',          (4, 0), (4, -1),  'RIGHT'),
        ('ALIGN',          (0, 0), (3, -1),  'LEFT'),
        ('ALIGN',          (5, 0), (5, -1),  'CENTER'),
        ('VALIGN',         (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',           (0, 0), (-1, -1), 0.4, colors.HexColor('#D0D0D0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F5F7FA')]),
        ('BACKGROUND',     (0, -1), (-1, -1), colors.HexColor('#E8EEF7')),
        ('FONTSIZE',       (0, -1), (-1, -1), 9),
        ('TOPPADDING',     (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 3),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_invoice_pdf_simple(invoice):
    """シンプル版PDF生成（デバッグ用）"""
    F = register_japanese_fonts()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []

    title_style = ParagraphStyle('Title', fontName=F, fontSize=18, alignment=TA_CENTER, spaceAfter=20)
    normal_style = ParagraphStyle('Normal', fontName=F, fontSize=10, leading=14)

    inv_no   = invoice.invoice_number or ''
    story.append(Paragraph(f'請求書 {inv_no}', title_style))
    story.append(Spacer(1, 20))

    inv_date  = str(invoice.invoice_date)  if invoice.invoice_date  else ''
    recv_name = invoice.receiving_company.name if invoice.receiving_company else ''
    cust_name = invoice.customer_company.name  if invoice.customer_company  else ''
    total     = int(invoice.total_amount)      if invoice.total_amount      else 0

    info = Paragraph(
        f'<b>発行日:</b> {inv_date}<br/>'
        f'<b>宛先:</b> {recv_name}<br/>'
        f'<b>差出人:</b> {cust_name}<br/>'
        f'<b>合計金額:</b> ¥{total:,}',
        normal_style,
    )
    story.append(info)
    doc.build(story)
    buffer.seek(0)
    return buffer
