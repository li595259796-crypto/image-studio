export const BRAND_NAME = 'Leo Image Studio'

export const locales = ['zh', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'zh'

interface LegalSection {
  title: string
  body: string
}

interface LocaleCopy {
  landing: {
    brand: string
    eyebrow: string
    headline: string
    subheading: string
    cta: string
    login: string
    samplesLabel: string
    samples: string[]
    sampleAltPrefix: string
  }
  nav: {
    generate: string
    edit: string
    gallery: string
    login: string
    logout: string
    quotaToday: string
    localeZh: string
    localeEn: string
    settings: string
    upgrade: string
  }
  legal: {
    termsLink: string
    privacyLink: string
    backHome: string
    footerCopyright: string
    termsTitle: string
    termsIntro: string
    termsSections: LegalSection[]
    privacyTitle: string
    privacyIntro: string
    privacySections: LegalSection[]
  }
  scenario: {
    pageTitle: string
    pageDescription: string
    backToScenarios: string
    product: { name: string; subtitle: string; placeholder: string }
    cover: { name: string; subtitle: string; placeholder: string }
    poster: { name: string; subtitle: string; placeholder: string }
    portrait: { name: string; subtitle: string; placeholder: string; styleLabel: string; extraLabel: string }
    illustration: { name: string; subtitle: string; placeholder: string }
    freeform: { name: string; subtitle: string }
    uploadLabel: string
    descriptionLabel: string
    aspectRatioLabel: string
    qualityLabel: string
    generateButton: string
    generatingButton: string
    refineButton: string
  }
  postAction: {
    download: string
    continueEdit: string
    retry: string
    retryWithSource: string
    copyPrompt: string
    copyToGenerate: string
    quotaNote: string
    copiedToast: string
  }
  refine: {
    title: string
    placeholder: string
    sendButton: string
    applyButton: string
    closeButton: string
  }
  auth: {
    loginTitle: string
    loginDescription: string
    loginButton: string
    loginLoading: string
    loginError: string
    signupTitle: string
    signupDescription: string
    signupButton: string
    signupLoading: string
    signupError: string
    signupAutoLoginError: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    passwordMismatch: string
    passwordTooShort: string
    noAccount: string
    hasAccount: string
    signupLink: string
    loginLink: string
    unexpectedError: string
  }
  gallery: {
    copyToGenerate: string
    copyPrompt: string
    continueEdit: string
  }
  settings: {
    pageTitle: string
    profileSection: string
    nameLabel: string
    namePlaceholder: string
    avatarLabel: string
    avatarUpload: string
    saveButton: string
    saving: string
    languageSection: string
    languageLabel: string
    securitySection: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
    changePasswordButton: string
    changingPassword: string
    profileSuccess: string
    passwordSuccess: string
    passwordMismatch: string
    passwordTooShort: string
    currentPasswordWrong: string
    localeSuccess: string
    localeFailed: string
  }
  upgrade: {
    pageTitle: string
    pageDescription: string
    currentPlan: string
    contactUs: string
    contactEmail: string
    perMonth: string
    perDay: string
    features: {
      dailyQuota: string
      monthlyQuota: string
      allScenarios: string
      fourK: string
      priorityQueue: string
      basicScenarios: string
    }
  }
  galleryFilter: {
    all: string
    today: string
    last7Days: string
    last30Days: string
    favoritesOnly: string
    timeRange: string
  }
}

export const copy: Record<Locale, LocaleCopy> = {
  zh: {
    landing: {
      brand: BRAND_NAME,
      eyebrow: 'AI 图像创作工作室',
      headline: '让灵感在一屏之内，变成可分享的图像。',
      subheading:
        '从文生图到轻量编辑，用更直接的方式完成海报、头像、封面和灵感草图。',
      cta: '开始创作',
      login: '登录',
      samplesLabel: '样例风格',
      samples: [
        '电影感人像',
        '极简产品海报',
        '未来城市夜景',
        '杂志封面构图',
        '温暖生活方式',
        '潮流头像设计',
        '品牌视觉探索',
        '高质感静物广告',
      ],
      sampleAltPrefix: '示例图',
    },
    nav: {
      generate: '创作',
      edit: '编辑',
      gallery: '画廊',
      login: '登录',
      logout: '退出登录',
      quotaToday: '今日',
      localeZh: '中',
      localeEn: 'EN',
      settings: '账户设置',
      upgrade: '升级方案',
    },
    legal: {
      termsLink: '服务条款',
      privacyLink: '隐私政策',
      backHome: '返回首页',
      footerCopyright: '© 2026 Leo Image Studio',
      termsTitle: '服务条款',
      termsIntro:
        '使用 Leo Image Studio 即表示你同意遵守以下基础规则，并对你的输入内容与生成结果负责。',
      termsSections: [
        {
          title: '内容与责任',
          body:
            '你需确保上传、输入和生成的内容不侵犯他人权益，也不得用于违法、欺诈或有害用途。',
        },
        {
          title: '服务可用性',
          body:
            '我们会持续优化服务，但不承诺服务始终无中断、无错误或永久保留所有生成记录。',
        },
        {
          title: '第三方能力',
          body:
            '部分图像能力由第三方模型与基础设施提供，相关响应速度、可用性与输出质量可能受其影响。',
        },
      ],
      privacyTitle: '隐私政策',
      privacyIntro:
        '我们只收集提供服务所需的最少信息，并用它来完成账户认证、图像生成与基础运营。',
      privacySections: [
        {
          title: '我们收集什么',
          body:
            '我们会处理你的邮箱、账户会话、输入提示词、上传图片和生成结果，用于完成创作流程。',
        },
        {
          title: '我们如何使用',
          body:
            '这些信息会被用于身份验证、配额控制、图像存储、质量改进以及排查服务问题。',
        },
        {
          title: '第三方服务',
          body:
            'Leo Image Studio 会调用第三方 AI API、数据库与对象存储服务，这些服务可能在处理请求时接触相关数据。',
        },
      ],
    },
    scenario: {
      pageTitle: '创作',
      pageDescription: '选择一个场景，3 步出图',
      backToScenarios: '← 返回选择场景',
      product: { name: '商品图', subtitle: '上传商品+换背景', placeholder: '放在蓝色水面背景上，自然光' },
      cover: { name: '封面视觉', subtitle: '主题配图生成', placeholder: '日落海边，暖色调，适合旅行主题' },
      poster: { name: '海报底图', subtitle: '视觉素材生成', placeholder: '城市夜景，霓虹灯，科技感氛围' },
      portrait: { name: '风格头像', subtitle: '上传人像+换风格', placeholder: '暖色调，微笑表情', styleLabel: '选择风格', extraLabel: '补充描述（可选）' },
      illustration: { name: '创意插画', subtitle: '描述即出图', placeholder: '一只戴眼镜的猫在读书，温馨水彩风' },
      freeform: { name: '自由创作', subtitle: '手写 prompt' },
      uploadLabel: '上传你的图片',
      descriptionLabel: '描述你想要的效果',
      aspectRatioLabel: '宽高比',
      qualityLabel: '质量',
      generateButton: '🎨 生成',
      generatingButton: '生成中...',
      refineButton: '💡 帮我完善需求',
    },
    postAction: {
      download: '下载',
      continueEdit: '继续编辑',
      retry: '再试一次',
      retryWithSource: '再试一次（含原图）',
      copyPrompt: '复制 Prompt',
      copyToGenerate: '复制到生成页',
      quotaNote: '消耗 1 次额度',
      copiedToast: '已复制到剪贴板',
    },
    refine: {
      title: '帮我完善需求',
      placeholder: '输入你的想法...',
      sendButton: '发送',
      applyButton: '使用此描述',
      closeButton: '关闭',
    },
    auth: {
      loginTitle: '登录',
      loginDescription: '登录你的账户',
      loginButton: '登录',
      loginLoading: '登录中...',
      loginError: '邮箱或密码错误',
      signupTitle: '注册',
      signupDescription: '创建你的账户',
      signupButton: '注册',
      signupLoading: '创建账户中...',
      signupError: '创建账户失败',
      signupAutoLoginError: '账户已创建，但自动登录失败，请手动登录',
      emailLabel: '邮箱',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '密码',
      passwordPlaceholder: '输入密码',
      confirmPasswordLabel: '确认密码',
      confirmPasswordPlaceholder: '再次输入密码',
      passwordMismatch: '两次密码不一致',
      passwordTooShort: '密码至少 8 位',
      noAccount: '没有账户？',
      hasAccount: '已有账户？',
      signupLink: '注册',
      loginLink: '登录',
      unexpectedError: '发生意外错误，请重试',
    },
    gallery: {
      copyToGenerate: '复制到生成页',
      copyPrompt: '复制 Prompt',
      continueEdit: '继续编辑',
    },
    settings: {
      pageTitle: '账户设置',
      profileSection: '基本信息',
      nameLabel: '昵称',
      namePlaceholder: '输入昵称',
      avatarLabel: '头像',
      avatarUpload: '上传新头像',
      saveButton: '保存',
      saving: '保存中...',
      languageSection: '语言偏好',
      languageLabel: '语言',
      securitySection: '安全',
      currentPassword: '当前密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      changePasswordButton: '修改密码',
      changingPassword: '修改中...',
      profileSuccess: '个人信息已更新',
      passwordSuccess: '密码已修改',
      passwordMismatch: '两次密码不一致',
      passwordTooShort: '密码至少 8 位',
      currentPasswordWrong: '当前密码错误',
      localeSuccess: '语言偏好已保存',
      localeFailed: '语言切换失败',
    },
    upgrade: {
      pageTitle: '升级方案',
      pageDescription: '解锁更多创作额度',
      currentPlan: '当前方案',
      contactUs: '联系我们',
      contactEmail: '升级咨询：support@image-studio.site',
      perMonth: '/月',
      perDay: '次/日',
      features: {
        dailyQuota: '次/日',
        monthlyQuota: '次/月',
        allScenarios: '全部场景',
        fourK: '4K 质量',
        priorityQueue: '优先队列',
        basicScenarios: '基础场景',
      },
    },
    galleryFilter: {
      all: '全部',
      today: '今天',
      last7Days: '最近 7 天',
      last30Days: '最近 30 天',
      favoritesOnly: '仅收藏',
      timeRange: '时间范围',
    },
  },
  en: {
    landing: {
      brand: BRAND_NAME,
      eyebrow: 'AI image creation studio',
      headline: 'Turn ideas into shareable visuals in a single screen.',
      subheading:
        'From prompt-based generation to lightweight edits, shape posters, avatars, covers, and fast visual explorations with less friction.',
      cta: 'Start Creating',
      login: 'Log In',
      samplesLabel: 'Sample moods',
      samples: [
        'Cinematic portrait',
        'Minimal product poster',
        'Futuristic night city',
        'Editorial cover layout',
        'Warm lifestyle frame',
        'Streetwear avatar concept',
        'Brand visual exploration',
        'Premium still-life ad',
      ],
      sampleAltPrefix: 'Sample image',
    },
    nav: {
      generate: 'Generate',
      edit: 'Edit',
      gallery: 'Gallery',
      login: 'Log In',
      logout: 'Log out',
      quotaToday: 'today',
      localeZh: '中',
      localeEn: 'EN',
      settings: 'Settings',
      upgrade: 'Upgrade',
    },
    legal: {
      termsLink: 'Terms',
      privacyLink: 'Privacy',
      backHome: 'Back to home',
      footerCopyright: '© 2026 Leo Image Studio',
      termsTitle: 'Terms of Service',
      termsIntro:
        'By using Leo Image Studio, you agree to these basic terms and remain responsible for the prompts, uploads, and outputs tied to your account.',
      termsSections: [
        {
          title: 'Content responsibility',
          body:
            'You must ensure that the content you upload, prompt, or generate does not violate laws or infringe on the rights of others.',
        },
        {
          title: 'Service availability',
          body:
            'We continuously improve the service, but we cannot guarantee uninterrupted access, error-free output, or permanent storage of every result.',
        },
        {
          title: 'Third-party providers',
          body:
            'Some image capabilities rely on third-party model and infrastructure providers, so speed, availability, and quality may vary.',
        },
      ],
      privacyTitle: 'Privacy Policy',
      privacyIntro:
        'We collect the minimum information needed to run the product and deliver account, generation, and storage features.',
      privacySections: [
        {
          title: 'What we collect',
          body:
            'We process your email address, session data, prompts, uploaded images, and generated outputs so the core product can function.',
        },
        {
          title: 'How we use it',
          body:
            'We use this information for authentication, quota enforcement, image storage, service quality improvements, and operational troubleshooting.',
        },
        {
          title: 'External services',
          body:
            'Leo Image Studio uses third-party AI APIs, database providers, and blob storage, which may handle relevant request data to fulfill the service.',
        },
      ],
    },
    scenario: {
      pageTitle: 'Create',
      pageDescription: 'Pick a scenario, generate in 3 steps',
      backToScenarios: '← Back to scenarios',
      product: { name: 'Product Photo', subtitle: 'Upload product + change background', placeholder: 'On a blue water background, natural lighting' },
      cover: { name: 'Cover Visual', subtitle: 'Theme visual generation', placeholder: 'Ocean sunset, warm tones, travel theme' },
      poster: { name: 'Poster Background', subtitle: 'Visual asset generation', placeholder: 'City night, neon lights, tech atmosphere' },
      portrait: { name: 'Style Portrait', subtitle: 'Upload photo + restyle', placeholder: 'Warm tones, smiling', styleLabel: 'Choose style', extraLabel: 'Extra description (optional)' },
      illustration: { name: 'Creative Illustration', subtitle: 'Describe and generate', placeholder: 'A cat wearing glasses reading a book, cozy watercolor style' },
      freeform: { name: 'Free Create', subtitle: 'Write your own prompt' },
      uploadLabel: 'Upload your image',
      descriptionLabel: 'Describe the look you want',
      aspectRatioLabel: 'Aspect Ratio',
      qualityLabel: 'Quality',
      generateButton: '🎨 Generate',
      generatingButton: 'Generating...',
      refineButton: '💡 Help me refine',
    },
    postAction: {
      download: 'Download',
      continueEdit: 'Continue Edit',
      retry: 'Retry',
      retryWithSource: 'Retry (with source)',
      copyPrompt: 'Copy Prompt',
      copyToGenerate: 'Copy to Generate',
      quotaNote: 'Uses 1 credit',
      copiedToast: 'Copied to clipboard',
    },
    refine: {
      title: 'Help me refine',
      placeholder: 'Type your idea...',
      sendButton: 'Send',
      applyButton: 'Use this description',
      closeButton: 'Close',
    },
    auth: {
      loginTitle: 'Sign In',
      loginDescription: 'Sign in to your account',
      loginButton: 'Sign In',
      loginLoading: 'Signing in...',
      loginError: 'Invalid email or password.',
      signupTitle: 'Sign Up',
      signupDescription: 'Create your account',
      signupButton: 'Sign Up',
      signupLoading: 'Creating account...',
      signupError: 'Failed to create account.',
      signupAutoLoginError: 'Account created but sign-in failed. Please sign in manually.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Your password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm your password',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signupLink: 'Sign Up',
      loginLink: 'Sign In',
      unexpectedError: 'An unexpected error occurred. Please try again.',
    },
    gallery: {
      copyToGenerate: 'Copy to Generate',
      copyPrompt: 'Copy Prompt',
      continueEdit: 'Continue Edit',
    },
    settings: {
      pageTitle: 'Account Settings',
      profileSection: 'Profile',
      nameLabel: 'Display Name',
      namePlaceholder: 'Enter display name',
      avatarLabel: 'Avatar',
      avatarUpload: 'Upload new avatar',
      saveButton: 'Save',
      saving: 'Saving...',
      languageSection: 'Language',
      languageLabel: 'Language',
      securitySection: 'Security',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePasswordButton: 'Change Password',
      changingPassword: 'Changing...',
      profileSuccess: 'Profile updated',
      passwordSuccess: 'Password changed',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      currentPasswordWrong: 'Current password is incorrect.',
      localeSuccess: 'Language preference saved',
      localeFailed: 'Language switch failed',
    },
    upgrade: {
      pageTitle: 'Upgrade Plans',
      pageDescription: 'Unlock more creative credits',
      currentPlan: 'Current Plan',
      contactUs: 'Contact Us',
      contactEmail: 'Upgrade inquiries: support@image-studio.site',
      perMonth: '/mo',
      perDay: '/day',
      features: {
        dailyQuota: '/day',
        monthlyQuota: '/month',
        allScenarios: 'All scenarios',
        fourK: '4K quality',
        priorityQueue: 'Priority queue',
        basicScenarios: 'Basic scenarios',
      },
    },
    galleryFilter: {
      all: 'All',
      today: 'Today',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      favoritesOnly: 'Favorites only',
      timeRange: 'Time range',
    },
  },
}
