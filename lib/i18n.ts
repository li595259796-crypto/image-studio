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
  },
}
