# -*- coding: utf-8 -*-
"""Open each docx in Word, update the Table of Contents + all fields, save, then export to PDF."""
import os, win32com.client

BASE = r'c:/Users/gowth/OneDrive/Desktop/27 trading'
FILES = ['27-Markets-Complete-Workflow.docx', '27-Markets-How-It-Works.docx']
wdFormatPDF = 17

word = win32com.client.Dispatch('Word.Application')
word.Visible = False
try:
    for f in FILES:
        path = os.path.join(BASE, f)
        if not os.path.exists(path):
            print('SKIP (missing):', f); continue
        doc = word.Documents.Open(os.path.abspath(path))
        # update Table(s) of Contents
        for i in range(doc.TablesOfContents.Count):
            doc.TablesOfContents(i + 1).Update()
        # update every field in every story (body, headers, footers)
        for story in doc.StoryRanges:
            story.Fields.Update()
        doc.Repaginate()
        doc.Save()  # persist populated TOC/page numbers back into the docx
        pdf = os.path.abspath(os.path.join(BASE, f.replace('.docx', '.pdf')))
        doc.ExportAsFixedFormat(pdf, wdFormatPDF)
        doc.Close(SaveChanges=False)
        print('OK ->', os.path.basename(pdf))
finally:
    word.Quit()
print('Done.')
