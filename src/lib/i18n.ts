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
    availableGroups: "Magulu Omwe Alipo",
    createGroup: "Pangani Gulu Latsopano",
    groupName: "Dzina la Gulu",
    description: "Kufotokoza",
    contributionAmount: "Ndalama Zopereka",
    frequency: "Nthawi Zonse",
    maxMembers: "Chiwerengero cha Anthu",
    startDate: "Tsiku Loyamba",
    noGroupsYet: "Simunalowe m'gulu lililonse",
    noAvailableGroups: "Palibe magulu omwe angalowemo",
    logout: "Tulukani",
    groupDetails: "Zambiri za Gulu",
    viewGroup: "Onani Gulu",
    
    // Onboarding
    onboardingTitle1: "Sungani Ndalama Pamodzi",
    onboardingText1: "Lowani m'magulu osunga ndalama ndi anzanu, abale ndi anthu ammudzi mwanu",
    onboardingTip1: "Kukonza mwamsanga mphindi 2",
    onboardingTitle2: "Gawanani Ndi Anzanu",
    onboardingText2: "Pangani kapena lowani m'gulu. Itanani anzanu ndi code yophweka",
    onboardingTip2: "Pangani gulu lanu losunga ndalama",
    onboardingTitle3: "Landirani Ndalama Zanu",
    onboardingText3: "Aliyense apereka ndalama zake. Membala aliyense amalandira ndalama zonse potsatira",
    onboardingTip3: "Ndalama zotetezeka komanso zokha",
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
    next: "Pita Kutsogolo",
    back: "Bwerera Kumbuyo",
    submit: "Tumizani",
    cancel: "Lekani",
    save: "Sungani",
    createGroupBtn: "Pangani Gulu",
    creating: "Kukupanga...",
    loading: "Kulodera...",
    pleaseWait: "Chonde dikira...",
    
    // Dashboard
    dashboard: "Dashibodi",
    wallet: "Chikwama",
    profile: "Mbiri Yanu",
    notifications: "Mauthenga",
    settings: "Makonzedwe",
    home: "Kunyumba",
    
    // Wallet
    balance: "Ndalama Zilipo",
    deposit: "Ikani Ndalama",
    withdraw: "Tengani Ndalama",
    transactions: "Zochitika",
    recentTransactions: "Zochitika Zaposachedwa",
    noTransactions: "Palibe zochitika",
    
    // Group Details
    members: "Mamembala",
    chat: "Kulankhulana",
    contribute: "Perekani",
    admin: "Woyendetsa",
    payouts: "Malipiro",
    totalMembers: "Mamembala Onse",
    nextPayout: "Lipiro Lotsatira",
    
    // Chat
    typeMessage: "Lembani uthenga...",
    sendMessage: "Tumizani",
    imageShared: "Chithunzi chagawidwa",
    
    // Actions
    send: "Tumizani",
    share: "Gawanani",
    invite: "Itanani",
    leave: "Chokani",
    delete: "Chotsani",
    edit: "Sinthani",
    view: "Onani",
    confirm: "Vomerezani",
    retry: "Yesaninso",
    close: "Tsekani",
    
    // Trust Score
    trustScore: "Chiwerengero cha Kukhulupirira",
    trustLevel: "Mulingo wa Kukhulupirira",
    viewHistory: "Onani Mbiri",
    diamondTrust: "Kukhulupirira Kwakukulu",
    highlyTrusted: "Wokhulupiririka Kwambiri",
    trustedMember: "Membala Wokhulupiririka",
    goodStanding: "Muli Bwino",
    fairStanding: "Muli Bwinobwino",
    needsImprovement: "Mufuna Kuwonjezera",
    
    // Bonuses
    bonuses: "Maphiri",
    bonusEarned: "Mphiri Lopezeka",
    totalEarned: "Zonse Zopezeka",
    noBonusesYet: "Palibe maphiri pano",
    earnBonuses: "Pezani maphiri popereka nthawi yake!",
    
    // Setup Progress
    setupProgress: "Kukonza",
    completeSetup: "Malizani Kukonza",
    addPaymentMethod: "Onjezani Njira Yolipira",
    joinCreateGroup: "Lowani kapena Pangani Gulu",
    makeFirstContribution: "Perekani Koyamba",
    addNow: "Onjezani Tsopano",
    getStartedBtn: "Yambani",
    viewGroupsBtn: "Onani Magulu",
    
    // AI Assistant
    aiAssistant: "Mothandizi wa AI",
    askAnything: "Funsani chilichonse za PayFesa...",
    aiThinking: "Ndikulingalira...",
    aiCanMakeMistakes: "AI imatha kulakwitsa. Tsimikizani zinthu zofunikira.",
    
    // Payment Methods
    paymentMethod: "Njira Yolipira",
    linkPaymentMethod: "Lumikizani Njira Yolipira",
    
    // Validation & Errors
    required: "Gawo ili ndi lofunika",
    invalidPhone: "Nambala ya foni sizili bwino",
    pinMismatch: "Ma PIN sagwirizana",
    pinLength: "PIN iyenera kukhala manambala 4",
    errorOccurred: "Chholakwika china chachitika",
    tryAgain: "Chonde yesaninso",
    connectionError: "Vuto la kulumikizana. Yangʼanani intaneti yanu",
    
    // Success Messages
    success: "Zachitika Bwino",
    savedSuccessfully: "Zasungidwa bwino",
    contributionSuccess: "Kupereka kwachitika bwino",
    paymentSuccess: "Kulipira kwachitika bwino",
    
    // Status
    active: "Yogwira Ntchito",
    pending: "Kuyembekezera",
    completed: "Zamalizidwa",
    failed: "Sizinachitike",
    processing: "Zikulingalira",
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