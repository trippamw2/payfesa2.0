import natbankLogo from '@/assets/natbank-logo.png';
import standardBankLogo from '@/assets/standard-bank-logo.png';
import fdhBankLogo from '@/assets/fdh-bank-logo.png';
import fcbLogo from '@/assets/fcb-logo.png';
import nbsBankLogo from '@/assets/nbs-bank-logo.png';
import cdhBankLogo from '@/assets/cdh-bank-logo.png';
import ecobankLogo from '@/assets/ecobank-logo.png';
import centenaryBankLogo from '@/assets/centenary-bank-logo.png';

export const BANK_LOGOS: { [key: string]: string } = {
  'National Bank of Malawi': natbankLogo,
  'Standard Bank Malawi': standardBankLogo,
  'FDH Bank': fdhBankLogo,
  'First Capital Bank': fcbLogo,
  'NBS Bank': nbsBankLogo,
  'CDH Investment Bank': cdhBankLogo,
  'Ecobank Malawi': ecobankLogo,
  'Centenary Bank': centenaryBankLogo
};

export const getBankLogo = (bankName: string): string | undefined => {
  return BANK_LOGOS[bankName];
};
