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
    valuePill: string
    workbenchLabel: string
    workbenchDescription: string
  }
  nav: {
    canvas: string
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
  canvas: {
    listTitle: string
    listDescription: string
    emptyTitle: string
    emptyDescription: string
    newCanvas: string
    untitled: string
    openAction: string
    renameAction: string
    deleteAction: string
    detailTitle: string
    detailDescription: string
    autosaveIdle: string
    autosaveSaving: string
    autosaveSaved: string
    autosaveError: string
    panelTitle: string
    panelDescription: string
    modelLabel: string
    jobsLabel: string
    clearFinished: string
    statusGenerating: string
    statusCompleted: string
    statusFailed: string
    createFailed: string
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
  editForm: {
    imagesLabel: string
    promptLabel: string
    promptPlaceholder: string
    submitButton: string
    submittingButton: string
    dropzoneHint: string
    dropzoneFormats: string
    removeImageAria: string
    loadSourceFailed: string
    unsubmittedWarning: string
  }
  generateForm: {
    promptLabel: string
    modelLabel: string
  }
  imageActionError: {
    generic: string
    quotaExceeded: string
    timeout: string
    invalidReference: string
    upstreamUnavailable: string
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
    accessHeading: string
    accessSupport: string
  }
  gallery: {
    copyToGenerate: string
    copyPrompt: string
    continueEdit: string
    libraryTitle: string
    libraryDescription: string
    emptyTitle: string
    emptyDescription: string
    filteredEmptyTitle: string
    filteredEmptyDescription: string
  }
  settings: {
    pageTitle: string
    pageDescription: string
    tabs: {
      account: string
      security: string
      apiKeys: string
    }
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
    apiKeys: {
      loadingLabel: string
      retryLabel: string
      loadFailed: string
      saveSuccess: string
      saveFailed: string
      deleteSuccess: string
      deleteFailed: string
      testUnavailable: string
      summaryTitle: string
      summaryDescription: string
      betaLabel: string
      fairUseLabel: string
      fairUseDescription: string
      currentKeyLabel: string
      configuredLabel: string
      unconfiguredLabel: string
      emptyKeyLabel: string
      inputLabel: string
      inputPlaceholder: string
      saveLabel: string
      savingLabel: string
      deleteLabel: string
      deletingLabel: string
      testLabel: string
      testingLabel: string
      errorPrefix: string
      providers: {
        google: {
          title: string
          description: string
        }
        bytedance: {
          title: string
          description: string
        }
        alibaba: {
          title: string
          description: string
        }
      }
    }
  }
  upgrade: {
    pageTitle: string
    pageDescription: string
    usageTitle: string
    usageDescription: string
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

type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer Item)[]
      ? ReadonlyArray<DeepReadonly<Item>>
      : T extends object
        ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
        : T

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      deepFreeze(item)
    })
    return Object.freeze(value) as DeepReadonly<T>
  }

  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((nestedValue) => {
      deepFreeze(nestedValue)
    })
    return Object.freeze(value) as DeepReadonly<T>
  }

  return value as DeepReadonly<T>
}

export const copy: DeepReadonly<Record<Locale, LocaleCopy>> = deepFreeze({
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
      valuePill: '公共创作',
      workbenchLabel: '工作台',
      workbenchDescription: '在工作台里快速生成、调整和继续编辑图像。',
    },
    nav: {
      canvas: '画布',
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
    canvas: {
      listTitle: '我的画布',
      listDescription: '围绕一个创作项目持续生成、整理和比较图像。',
      emptyTitle: '还没有画布',
      emptyDescription: '创建第一块画布，开始你的多模型创作流程。',
      newCanvas: '新建画布',
      untitled: '未命名画布',
      openAction: '打开画布',
      renameAction: '重命名',
      deleteAction: '从列表移除',
      detailTitle: '创作画布',
      detailDescription: '在同一个项目上下文里继续整理和推进你的创作。',
      autosaveIdle: '已同步',
      autosaveSaving: '保存中…',
      autosaveSaved: '刚刚保存',
      autosaveError: '保存失败',
      panelTitle: '多模型生成',
      panelDescription: '用同一个 prompt 同时比较多个模型的结果。',
      modelLabel: '模型',
      jobsLabel: '生成结果',
      clearFinished: '清除已完成',
      statusGenerating: '生成中',
      statusCompleted: '已完成',
      statusFailed: '失败',
      createFailed: '创建画布失败，请重试',
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
    editForm: {
      imagesLabel: '参考图 (1-2 张)',
      promptLabel: '编辑指令',
      promptPlaceholder: '描述你想要的修改...',
      submitButton: '开始编辑',
      submittingButton: '编辑中...',
      dropzoneHint: '拖拽图片到这里，或点击上传',
      dropzoneFormats: '支持 PNG / JPG / WebP，单张最大 10MB',
      removeImageAria: '删除第 {index} 张图',
      loadSourceFailed: '无法加载源图片，请手动上传',
      unsubmittedWarning: '有未提交的图片，离开此页会丢失。确定要离开吗？',
    },
    generateForm: {
      promptLabel: '提示词',
      modelLabel: '模型',
    },
    imageActionError: {
      generic: '处理失败，请稍后重试。',
      quotaExceeded: '今日额度已用完。',
      timeout: '图像处理超时，请稍后重试。',
      invalidReference: '参考图无效或已失效。',
      upstreamUnavailable: '图像服务暂时不可用，请稍后再试。',
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
      accessHeading: '访问你的账户',
      accessSupport: '登录后可继续创作、查看作品并管理账户。',
    },
    gallery: {
      copyToGenerate: '复制到生成页',
      copyPrompt: '复制 Prompt',
      continueEdit: '继续编辑',
      libraryTitle: '作品库',
      libraryDescription: '集中查看你生成和保存的图像。',
      emptyTitle: '还没有作品',
      emptyDescription: '先去工作台生成第一张图像吧。',
      filteredEmptyTitle: '没有符合筛选条件的作品',
      filteredEmptyDescription: '试试调整筛选条件，或清除筛选后再查看作品库。',
    },
    settings: {
      tabs: {
        account: '账户',
        security: '安全',
        apiKeys: 'API 密钥',
      },
      pageTitle: '账户设置',
      pageDescription: '管理个人资料、语言偏好和安全设置。',
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
      apiKeys: {
        loadingLabel: 'Loading API keys...',
        retryLabel: 'Retry',
        loadFailed: 'Failed to load API keys',
        saveSuccess: 'API key saved',
        saveFailed: 'Failed to save API key',
        deleteSuccess: 'API key removed',
        deleteFailed: 'Failed to remove API key',
        testUnavailable: 'API key verification will arrive in a later phase.',
        summaryTitle: 'Bring Your Own API Keys',
        summaryDescription: 'Connect your own model credentials so the workbench can use your providers directly.',
        betaLabel: 'Beta',
        fairUseLabel: 'Fair use',
        fairUseDescription: 'BYOK calls skip platform quota accounting, but they still follow fair-use protections and server-side security checks.',
        currentKeyLabel: 'Current key',
        configuredLabel: 'Configured',
        unconfiguredLabel: 'Not configured',
        emptyKeyLabel: 'No key saved yet',
        inputLabel: 'New API key',
        inputPlaceholder: 'Paste an API key',
        saveLabel: 'Save',
        savingLabel: 'Saving...',
        deleteLabel: 'Delete',
        deletingLabel: 'Deleting...',
        testLabel: 'Test',
        testingLabel: 'Testing...',
        errorPrefix: 'Error:',
        providers: {
          google: {
            title: 'Google AI Studio',
            description: 'Use Gemini Flash image generation with your own key.',
          },
          bytedance: {
            title: 'ByteDance Ark',
            description: 'Use Seedream generation with your own Ark API token.',
          },
          alibaba: {
            title: 'Alibaba DashScope',
            description: 'Use Tongyi Wanx generation with your own DashScope key.',
          },
        },
      },
    },
    upgrade: {
      pageTitle: '升级方案',
      pageDescription: '解锁更多创作额度',
      usageTitle: '用量说明',
      usageDescription: '查看当前方案每天和每月可用的生成额度。',
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
      valuePill: 'Public creation',
      workbenchLabel: 'Workbench',
      workbenchDescription: 'Create, refine, and continue editing images from a single workbench.',
    },
    nav: {
      canvas: 'Canvas',
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
    canvas: {
      listTitle: 'My Canvases',
      listDescription: 'Keep each creative project in one shared visual workspace.',
      emptyTitle: 'No canvases yet',
      emptyDescription: 'Create your first canvas to start a multi-model creative flow.',
      newCanvas: 'New Canvas',
      untitled: 'Untitled Canvas',
      openAction: 'Open canvas',
      renameAction: 'Rename',
      deleteAction: 'Remove from list',
      detailTitle: 'Creative Canvas',
      detailDescription: 'Stay inside one project context while arranging and evolving your work.',
      autosaveIdle: 'Synced',
      autosaveSaving: 'Saving…',
      autosaveSaved: 'Saved just now',
      autosaveError: 'Save failed',
      panelTitle: 'Multi-model generation',
      panelDescription: 'Compare several model results from the same prompt in one pass.',
      modelLabel: 'Models',
      jobsLabel: 'Generation results',
      clearFinished: 'Clear finished',
      statusGenerating: 'Generating',
      statusCompleted: 'Completed',
      statusFailed: 'Failed',
      createFailed: 'Failed to create canvas. Please try again.',
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
    editForm: {
      imagesLabel: 'Reference images (1-2)',
      promptLabel: 'Editing prompt',
      promptPlaceholder: 'Describe the edits you want to make...',
      submitButton: 'Edit',
      submittingButton: 'Editing...',
      dropzoneHint: 'Drop images here or click to upload',
      dropzoneFormats: 'PNG, JPG, WebP up to 10MB',
      removeImageAria: 'Remove image {index}',
      loadSourceFailed: 'Failed to load source image, please upload manually',
      unsubmittedWarning: 'You have unsubmitted images. Leaving will discard them. Continue?',
    },
    generateForm: {
      promptLabel: 'Prompt',
      modelLabel: 'Model',
    },
    imageActionError: {
      generic: 'Request failed. Please try again.',
      quotaExceeded: "Today's quota is exhausted.",
      timeout: 'Image processing timed out. Please try again.',
      invalidReference: 'Reference image is invalid or expired.',
      upstreamUnavailable: 'Image service is temporarily unavailable. Please try again.',
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
      accessHeading: 'Access your account',
      accessSupport: 'Sign in to continue creating, reviewing outputs, and managing your workspace.',
    },
    gallery: {
      copyToGenerate: 'Copy to Generate',
      copyPrompt: 'Copy Prompt',
      continueEdit: 'Continue Edit',
      libraryTitle: 'Library',
      libraryDescription: 'See the images you generate and save in one place.',
      emptyTitle: 'No creations yet',
      emptyDescription: 'Head to the workbench to generate your first image.',
      filteredEmptyTitle: 'No creations match this filter',
      filteredEmptyDescription: 'Try adjusting the filter or clear it to browse the full library.',
    },
    settings: {
      pageTitle: 'Account Settings',
      pageDescription:
        'Manage your profile, language preference, security settings, and BYOK access.',
      tabs: {
        account: 'Account',
        security: 'Security',
        apiKeys: 'API Keys',
      },
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
      apiKeys: {
        loadingLabel: 'Loading API keys...',
        retryLabel: 'Retry',
        loadFailed: 'Failed to load API keys',
        saveSuccess: 'API key saved',
        saveFailed: 'Failed to save API key',
        deleteSuccess: 'API key removed',
        deleteFailed: 'Failed to remove API key',
        testUnavailable: 'API key verification will arrive in a later phase.',
        summaryTitle: 'Bring Your Own API Keys',
        summaryDescription:
          'Connect your own model credentials so the workbench can use your providers directly.',
        betaLabel: 'Beta',
        fairUseLabel: 'Fair use',
        fairUseDescription:
          'BYOK calls skip platform quota accounting, but they still follow fair-use protections and server-side security checks.',
        currentKeyLabel: 'Current key',
        configuredLabel: 'Configured',
        unconfiguredLabel: 'Not configured',
        emptyKeyLabel: 'No key saved yet',
        inputLabel: 'New API key',
        inputPlaceholder: 'Paste an API key',
        saveLabel: 'Save',
        savingLabel: 'Saving...',
        deleteLabel: 'Delete',
        deletingLabel: 'Deleting...',
        testLabel: 'Test',
        testingLabel: 'Testing...',
        errorPrefix: 'Error:',
        providers: {
          google: {
            title: 'Google AI Studio',
            description: 'Use Gemini Flash image generation with your own key.',
          },
          bytedance: {
            title: 'ByteDance Ark',
            description: 'Use Seedream generation with your own Ark API token.',
          },
          alibaba: {
            title: 'Alibaba DashScope',
            description: 'Use Tongyi Wanx generation with your own DashScope key.',
          },
        },
      },
    },
    upgrade: {
      pageTitle: 'Upgrade Plans',
      pageDescription: 'Unlock more creative credits',
      usageTitle: 'Usage',
      usageDescription: 'See how many generations your current plan includes each day and month.',
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
})
