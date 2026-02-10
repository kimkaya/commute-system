// =====================================================
// 급여명세서 PDF 생성
// =====================================================

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// jspdf-autotable 타입 확장
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: autoTableOptions) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface autoTableOptions {
  startY?: number;
  head?: string[][];
  body?: (string | number)[][];
  theme?: string;
  styles?: {
    font?: string;
    fontSize?: number;
    cellPadding?: number;
    halign?: 'left' | 'center' | 'right';
  };
  headStyles?: {
    fillColor?: number[];
    textColor?: number[];
    fontStyle?: string;
  };
  columnStyles?: {
    [key: number]: {
      halign?: 'left' | 'center' | 'right';
      cellWidth?: number | 'auto';
    };
  };
  margin?: { left?: number; right?: number };
}

export type PayslipData = {
  // 직원 정보
  employeeName: string;
  employeeNumber: string;
  department: string;
  position: string;
  
  // 급여 기간
  year: number;
  month: number;
  payDate: string;
  
  // 지급 항목
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  allowances: number;
  totalEarnings: number;
  
  // 공제 항목
  incomeTax: number;
  healthInsurance: number;
  nationalPension: number;
  employmentInsurance: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // 실수령액
  netPay: number;
  
  // 근무 정보
  workDays: number;
  totalHours: number;
  overtimeHours: number;
}

// 금액 포맷팅
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// 한글 폰트 대신 기본 폰트 사용 (한글은 유니코드로)
export function generatePayslipPdf(data: PayslipData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // =====================================================
  // 헤더
  // =====================================================
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Slip', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.year}. ${data.month}`, pageWidth / 2, yPos, { align: 'center' });

  // =====================================================
  // 직원 정보
  // =====================================================
  yPos += 15;
  doc.setFontSize(10);
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 30, 2, 2, 'FD');

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Info', margin + 5, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const col1X = margin + 5;
  const col2X = pageWidth / 2;
  
  doc.text(`Name: ${data.employeeName}`, col1X, yPos);
  doc.text(`Employee No: ${data.employeeNumber}`, col2X, yPos);
  
  yPos += 6;
  doc.text(`Department: ${data.department}`, col1X, yPos);
  doc.text(`Position: ${data.position}`, col2X, yPos);

  // =====================================================
  // 근무 정보
  // =====================================================
  yPos += 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'FD');

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Work Summary', margin + 5, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Work Days: ${data.workDays} days`, col1X, yPos);
  doc.text(`Total Hours: ${data.totalHours}h (OT: ${data.overtimeHours}h)`, col2X, yPos);

  // =====================================================
  // 지급 내역 테이블
  // =====================================================
  yPos += 18;
  
  doc.autoTable({
    startY: yPos,
    head: [['Earnings', 'Amount (KRW)']],
    body: [
      ['Base Salary', formatCurrency(data.baseSalary)],
      ['Overtime Pay', formatCurrency(data.overtimePay)],
      ['Bonus', formatCurrency(data.bonus)],
      ['Allowances', formatCurrency(data.allowances)],
      ['Total Earnings', formatCurrency(data.totalEarnings)],
    ],
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
    margin: { left: margin, right: margin },
  });

  // =====================================================
  // 공제 내역 테이블
  // =====================================================
  yPos = doc.lastAutoTable.finalY + 10;
  
  doc.autoTable({
    startY: yPos,
    head: [['Deductions', 'Amount (KRW)']],
    body: [
      ['Income Tax', formatCurrency(data.incomeTax)],
      ['Health Insurance', formatCurrency(data.healthInsurance)],
      ['National Pension', formatCurrency(data.nationalPension)],
      ['Employment Insurance', formatCurrency(data.employmentInsurance)],
      ['Other Deductions', formatCurrency(data.otherDeductions)],
      ['Total Deductions', formatCurrency(data.totalDeductions)],
    ],
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
    margin: { left: margin, right: margin },
  });

  // =====================================================
  // 실수령액
  // =====================================================
  yPos = doc.lastAutoTable.finalY + 10;
  
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Pay', margin + 10, yPos + 13);
  doc.setFontSize(16);
  doc.text(`${formatCurrency(data.netPay)} KRW`, pageWidth - margin - 10, yPos + 13, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);

  // =====================================================
  // 푸터
  // =====================================================
  yPos = doc.lastAutoTable.finalY + 45;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Payment Date: ${data.payDate}`, margin, yPos);
  doc.text('This is a computer-generated document.', pageWidth - margin, yPos, { align: 'right' });

  // =====================================================
  // PDF 다운로드
  // =====================================================
  const fileName = `Payslip_${data.employeeNumber}_${data.year}${String(data.month).padStart(2, '0')}.pdf`;
  doc.save(fileName);
}
