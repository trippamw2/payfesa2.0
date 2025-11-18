declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    head?: any[][];
    body?: any[][];
    startY?: number;
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    columnStyles?: any;
    margin?: any;
    theme?: 'striped' | 'grid' | 'plain';
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
