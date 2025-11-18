// Multi-language support for English and Chichewa
export type Language = 'en' | 'ny';

export const translations = {
  en: {
    // Splash & Welcome
    welcome: "Welcome to PayFesa",
    tagline: "Save Together, Grow Together",
    chipereganyu: "Chipereganyu",
    welcomeUser: "Welcome to PayFesa",
    
    // Language Selection
    selectLanguage: "Select Your Language",
    chooseLanguage: "Choose your preferred language",
    english: "English",
    chichewa: "Chichewa",
    continue: "Continue",
    
    // Auth
    login: "Login",
    register: "Register",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    pin: "4-Digit PIN",
    confirmPin: "Confirm PIN",
    enterPin: "Enter your 4-digit PIN",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    
    // Mobile Money
    mobileMoneySetup: "Mobile Money Setup",
    selectProvider: "Select Provider",
    airtelMoney: "Airtel Money",
    tnmMpamba: "TNM Mpamba",
    accountName: "Account Name",
    linkAccount: "Link Account",
    
    // Forgot PIN
    forgotPin: "Forgot PIN?",
    resetPin: "Reset PIN",
    verifyIdentity: "Verify Your Identity",
    securityQuestion: "Security Question",
    securityAnswer: "Your Answer",
    newPin: "New 4-Digit PIN",
    confirmNewPin: "Confirm New PIN",
    resetPinSuccess: "PIN reset successful",
    incorrectAnswer: "Incorrect security answer",
    
    // Groups
    groups: "Groups",
    myGroups: "My Groups",
    availableGroups: "Available Groups",
    createGroup: "Create New Group",
    groupName: "Group Name",
    description: "Description",
    contributionAmount: "Contribution Amount",
    frequency: "Frequency",
    maxMembers: "Maximum Members",
    startDate: "Start Date",
    noGroupsYet: "You haven't joined any groups yet",
    noAvailableGroups: "No available groups to join",
    logout: "Logout",
    
    // Onboarding
    onboardingTitle1: "Start Saving Money",
    onboardingText1: "Join groups and save money together with friends and family.",
    onboardingTip1: "Quick setup in 2 minutes",
    onboardingTitle2: "Share With Friends",
    onboardingText2: "Create or join groups. Share your group code with others.",
    onboardingTip2: "Build your savings circle",
    onboardingTitle3: "Get Your Money",
    onboardingText3: "Everyone saves together. Each person gets their turn to receive the full payout.",
    onboardingTip3: "Safe and automatic payments",
    getStarted: "Get Started",
    skip: "Skip",
    
    // Groups - Join by Code
    joinByCode: "Join by Code",
    groupCode: "Group Code",
    inviterName: "Inviter Name",
    joinGroup: "Join Group",
    enterGroupCode: "Enter group code",
    enterInviterName: "Enter inviter's full name",
    groupNotFound: "Group not found or inviter name doesn't match",
    groupJoinedSuccess: "Successfully joined the group!",
    groupFull: "This group is full",
    alreadyInGroup: "You are already in this group",
    shareGroupCode: "Share this code with others to join:",
    copyCode: "Copy Code",
    codeCopied: "Code copied!",
    
    // Common
    next: "Next",
    back: "Back",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    createGroupBtn: "Create Group",
    creating: "Creating...",
    
    // Dashboard
    dashboard: "Dashboard",
    wallet: "Wallet",
    profile: "Profile",
    notifications: "Notifications",
    settings: "Settings",
    
    // Wallet
    balance: "Balance",
    deposit: "Deposit",
    withdraw: "Withdraw",
    transactions: "Transactions",
    
    // Group Details
    members: "Members",
    chat: "Chat",
    contribute: "Contribute",
    admin: "Admin",
    payouts: "Payouts",
    
    // Actions
    send: "Send",
    share: "Share",
    invite: "Invite",
    leave: "Leave",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    confirm: "Confirm",
    
    // Validation
    required: "This field is required",
    invalidPhone: "Invalid phone number",
    pinMismatch: "PINs do not match",
    pinLength: "PIN must be 4 digits",
  },
  ny: {
    // Splash & Welcome
    welcome: "Takulandirani ku PayFesa",
    tagline: "Tisunge Limodzi, Tikule Limodzi",
    chipereganyu: "Chipereganyu",
    welcomeUser: "Takulandirani ku PayFesa",
    
    // Language Selection
    selectLanguage: "Sankhani Chilankhulo Chanu",
    chooseLanguage: "Sankhani chilankhulo chomwe mukufuna",
    english: "Chingerezi",
    chichewa: "Chichewa",
    continue: "Pitirizani",
    
    // Auth
    login: "Lowani",
    register: "Lembetsani",
    fullName: "Dzina Lathunthu",
    phoneNumber: "Nambala ya Foni",
    pin: "PIN ya Manambala 4",
    confirmPin: "Tsimikizani PIN",
    enterPin: "Lowetsani PIN yanu ya manambala 4",
    createAccount: "Pangani Akaunti",
    alreadyHaveAccount: "Kodi muli ndi akaunti kale?",
    dontHaveAccount: "Mulibe akaunti?",
    
    // Mobile Money
    mobileMoneySetup: "Kukonza Mobile Money",
    selectProvider: "Sankhani Kampani",
    airtelMoney: "Airtel Money",
    tnmMpamba: "TNM Mpamba",
    accountName: "Dzina la Akaunti",
    linkAccount: "Lumikizani Akaunti",
    
    // Forgot PIN
    forgotPin: "Mwayiwala PIN?",
    resetPin: "Sinthani PIN",
    verifyIdentity: "Tsimikizani Inu",
    securityQuestion: "Funso la Chitetezo",
    securityAnswer: "Yankho Lanu",
    newPin: "PIN Yatsopano ya Manambala 4",
    confirmNewPin: "Tsimikizani PIN Yatsopano",
    resetPinSuccess: "Kusinthidwa kwa PIN kwachitika bwino",
    incorrectAnswer: "Yankho lolakwika",
    
    // Groups
    groups: "Magulu",
    myGroups: "Magulu Anga",
    availableGroups: "Magulu Pano",
    createGroup: "Panga Gulu",
    groupName: "Dzina La Gulu",
    description: "Fotokoza",
    contributionAmount: "Ndalama",
    frequency: "Kuchuluka",
    maxMembers: "Anthu",
    startDate: "Tsiku",
    noGroupsYet: "Palibe magulu",
    noAvailableGroups: "Palibe magulu",
    logout: "Tuluka",
    
    // Onboarding
    onboardingTitle1: "Sungani Ndalama",
    onboardingText1: "Lowani m'magulu ndipo sungani ndalama limodzi ndi anzanu.",
    onboardingTip1: "Kukonza kwamsanga mphindi 2",
    onboardingTitle2: "Gawanani Ndi Anzanu",
    onboardingText2: "Pangani kapena lowani gulu. Gawanani code yanu ndi anzanu.",
    onboardingTip2: "Kwezani gulu lanu",
    onboardingTitle3: "Landirani Ndalama",
    onboardingText3: "Aliyense amasunga limodzi. Aliyense amalandira ndalama zonse pa nthawi yake.",
    onboardingTip3: "Ndalama zotetezeka zokha",
    getStarted: "Yambani",
    skip: "Dulani",
    
    // Groups - Join by Code
    joinByCode: "Lowani ndi Code",
    groupCode: "Code ya Gulu",
    inviterName: "Dzina la Woyitanira",
    joinGroup: "Lowani Gulu",
    enterGroupCode: "Lowetsani code ya gulu",
    enterInviterName: "Lowetsani dzina lathunthu la woyitanira",
    groupNotFound: "Gulu silinapezekedwe kapena dzina la woyitanira siligwirizana",
    groupJoinedSuccess: "Mwalowa bwino m'gululi!",
    groupFull: "Gululi ladzaza",
    alreadyInGroup: "Muli kale m'gululi",
    shareGroupCode: "Gawanani code iyi ndi ena kuti alowe:",
    copyCode: "Kopa Code",
    codeCopied: "Code yakopedwa!",
    
    // Common
    next: "Pita",
    back: "Bwerera",
    submit: "Tumiza",
    cancel: "Leka",
    save: "Sunga",
    createGroupBtn: "Panga",
    creating: "Kupanga...",
    
    // Dashboard
    dashboard: "Dashibodi",
    wallet: "Chikwama",
    profile: "Mbiri",
    notifications: "Mauthenga",
    settings: "Makonzedwe",
    
    // Wallet
    balance: "Ndalama",
    deposit: "Yika",
    withdraw: "Tengani",
    transactions: "Zochita",
    
    // Group Details
    members: "Mamembala",
    chat: "Lankhula",
    contribute: "Perekani",
    admin: "Woyendetsa",
    payouts: "Malipiro",
    
    // Actions
    send: "Tumiza",
    share: "Gawana",
    invite: "Itanani",
    leave: "Tuluka",
    delete: "Fufuta",
    edit: "Sinthani",
    view: "Onani",
    confirm: "Vomereza",
    
    // Validation
    required: "Gawo ili ndi lofunikira",
    invalidPhone: "Nambala ya foni sizili bwino",
    pinMismatch: "Ma PIN sagwirizana",
    pinLength: "PIN iyenera kukhala manambala 4",
  }
};

export const useTranslation = (lang: Language = 'en') => {
  try {
    // Safe fallback if language not found
    const selectedLang = translations[lang] ? lang : 'en';
    return {
      t: (key: keyof typeof translations.en) => {
        try {
          return translations[selectedLang][key] || translations['en'][key];
        } catch (error) {
          console.error('Translation key error:', key, error);
          return key;
        }
      },
      lang: selectedLang
    };
  } catch (error) {
    console.error('Translation system error, using fallback:', error);
    return {
      t: (key: keyof typeof translations.en) => translations['en'][key] || key,
      lang: 'en' as Language
    };
  }
};