// AI全能助手 - WhatsApp增强功能模块
// 作者: Achord (Tel: 13160235855, Email: achordchan@gmail.com)
// 功能: 根据对方号码显示国家天气和当地时间
// 版本: V3.0
// 
// 请尊重开源项目，二开保留作者信息

const WeatherInfo = {
  // 版本信息
  version: 'V3.0',
  
  // 状态管理
  currentStatus: 'idle', // idle, loading, success, error, no-number
  currentInfoElement: null,
  injectionIndicator: null, // WhatsApp 标志注入提示元素
  isProtected: false, // 版权保护状态
  lastNoContactShownAt: 0,
  initialized: false,
  observerInitialized: false,
  lastChatCheckAt: 0,
  lastExtractAt: 0,
  consecutiveNoNumber: 0,
  statusMessages: {
    loading: '🌤️ 正在获取天气信息...',
    error: '❌ 天气信息加载失败',
    'no-number': '📱 未检测到有效号码',
    success: '✅ 天气信息加载完成',
    'no-contact': '👤 未检测到聊天对象'
  },

  // 国家代码和区号映射表
  countryCodeMap: {
    // 主要国家和地区的电话区号
    // 注意：+1区号被多个北美国家共享，需要特殊处理
    '1': { 
      country: 'NANP', // North American Numbering Plan
      name: '北美地区', 
      timezone: 'America/New_York', 
      flag: '🌎',
      isShared: true,
      countries: [
        { country: 'US', name: '美国', timezone: 'America/New_York', flag: '🇺🇸' },
        { country: 'CA', name: '加拿大', timezone: 'America/Toronto', flag: '🇨🇦' },
        { country: 'JM', name: '牙买加', timezone: 'America/Jamaica', flag: '🇯🇲' },
        { country: 'BS', name: '巴哈马', timezone: 'America/Nassau', flag: '🇧🇸' },
        { country: 'BB', name: '巴巴多斯', timezone: 'America/Barbados', flag: '🇧🇧' },
        { country: 'AG', name: '安提瓜和巴布达', timezone: 'America/Antigua', flag: '🇦🇬' },
        { country: 'DM', name: '多米尼克', timezone: 'America/Dominica', flag: '🇩🇲' },
        { country: 'DO', name: '多米尼加', timezone: 'America/Santo_Domingo', flag: '🇩🇴' },
        { country: 'GD', name: '格林纳达', timezone: 'America/Grenada', flag: '🇬🇩' },
        { country: 'KN', name: '圣基茨和尼维斯', timezone: 'America/St_Kitts', flag: '🇰🇳' },
        { country: 'LC', name: '圣卢西亚', timezone: 'America/St_Lucia', flag: '🇱🇨' },
        { country: 'VC', name: '圣文森特和格林纳丁斯', timezone: 'America/St_Vincent', flag: '🇻🇨' },
        { country: 'TT', name: '特立尼达和多巴哥', timezone: 'America/Port_of_Spain', flag: '🇹🇹' }
      ]
    },
    '7': { 
      country: 'RU_KZ', // Russia-Kazakhstan shared code
      name: '俄语区', 
      timezone: 'Europe/Moscow', 
      flag: '🌍',
      isShared: true,
      countries: [
        { country: 'RU', name: '俄罗斯', timezone: 'Europe/Moscow', flag: '🇷🇺' },
        { country: 'KZ', name: '哈萨克斯坦', timezone: 'Asia/Almaty', flag: '🇰🇿' }
      ]
    },
    '20': { country: 'EG', name: '埃及', timezone: 'Africa/Cairo', flag: '🇪🇬' },
    '27': { country: 'ZA', name: '南非', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
    '30': { country: 'GR', name: '希腊', timezone: 'Europe/Athens', flag: '🇬🇷' },
    '31': { country: 'NL', name: '荷兰', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
    '32': { country: 'BE', name: '比利时', timezone: 'Europe/Brussels', flag: '🇧🇪' },
    '33': { country: 'FR', name: '法国', timezone: 'Europe/Paris', flag: '🇫🇷' },
    '34': { country: 'ES', name: '西班牙', timezone: 'Europe/Madrid', flag: '🇪🇸' },
    '36': { country: 'HU', name: '匈牙利', timezone: 'Europe/Budapest', flag: '🇭🇺' },
    '39': { country: 'IT', name: '意大利', timezone: 'Europe/Rome', flag: '🇮🇹' },
    '40': { country: 'RO', name: '罗马尼亚', timezone: 'Europe/Bucharest', flag: '🇷🇴' },
    '41': { country: 'CH', name: '瑞士', timezone: 'Europe/Zurich', flag: '🇨🇭' },
    '43': { country: 'AT', name: '奥地利', timezone: 'Europe/Vienna', flag: '🇦🇹' },
    '44': { 
      country: 'GB_TERRITORIES', // UK and territories
      name: '英联邦', 
      timezone: 'Europe/London', 
      flag: '🇬🇧',
      isShared: true,
      countries: [
        { country: 'GB', name: '英国', timezone: 'Europe/London', flag: '🇬🇧' },
        { country: 'JE', name: '泽西岛', timezone: 'Europe/Jersey', flag: '🇯🇪' },
        { country: 'GG', name: '根西岛', timezone: 'Europe/Guernsey', flag: '🇬🇬' },
        { country: 'IM', name: '马恩岛', timezone: 'Europe/Isle_of_Man', flag: '🇮🇲' }
      ]
    },
    '45': { country: 'DK', name: '丹麦', timezone: 'Europe/Copenhagen', flag: '🇩🇰' },
    '46': { country: 'SE', name: '瑞典', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
    '47': { country: 'NO', name: '挪威', timezone: 'Europe/Oslo', flag: '🇳🇴' },
    '48': { country: 'PL', name: '波兰', timezone: 'Europe/Warsaw', flag: '🇵🇱' },
    '49': { country: 'DE', name: '德国', timezone: 'Europe/Berlin', flag: '🇩🇪' },
    '51': { country: 'PE', name: '秘鲁', timezone: 'America/Lima', flag: '🇵🇪' },
    '52': { country: 'MX', name: '墨西哥', timezone: 'America/Mexico_City', flag: '🇲🇽' },
    '53': { country: 'CU', name: '古巴', timezone: 'America/Havana', flag: '🇨🇺' },
    '54': { country: 'AR', name: '阿根廷', timezone: 'America/Buenos_Aires', flag: '🇦🇷' },
    '55': { country: 'BR', name: '巴西', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
    '56': { country: 'CL', name: '智利', timezone: 'America/Santiago', flag: '🇨🇱' },
    '57': { country: 'CO', name: '哥伦比亚', timezone: 'America/Bogota', flag: '🇨🇴' },
    '58': { country: 'VE', name: '委内瑞拉', timezone: 'America/Caracas', flag: '🇻🇪' },
    '60': { country: 'MY', name: '马来西亚', timezone: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
    '61': { country: 'AU', name: '澳大利亚', timezone: 'Australia/Sydney', flag: '🇦🇺' },
    '62': { country: 'ID', name: '印度尼西亚', timezone: 'Asia/Jakarta', flag: '🇮🇩' },
    '63': { country: 'PH', name: '菲律宾', timezone: 'Asia/Manila', flag: '🇵🇭' },
    '64': { country: 'NZ', name: '新西兰', timezone: 'Pacific/Auckland', flag: '🇳🇿' },
    '65': { country: 'SG', name: '新加坡', timezone: 'Asia/Singapore', flag: '🇸🇬' },
    '66': { country: 'TH', name: '泰国', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
    '81': { country: 'JP', name: '日本', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
    '82': { country: 'KR', name: '韩国', timezone: 'Asia/Seoul', flag: '🇰🇷' },
    '84': { country: 'VN', name: '越南', timezone: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
    '86': { country: 'CN', name: '中国', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
    '90': { country: 'TR', name: '土耳其', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
    '91': { country: 'IN', name: '印度', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
    '92': { country: 'PK', name: '巴基斯坦', timezone: 'Asia/Karachi', flag: '🇵🇰' },
    '93': { country: 'AF', name: '阿富汗', timezone: 'Asia/Kabul', flag: '🇦🇫' },
    '94': { country: 'LK', name: '斯里兰卡', timezone: 'Asia/Colombo', flag: '🇱🇰' },
    '95': { country: 'MM', name: '缅甸', timezone: 'Asia/Yangon', flag: '🇲🇲' },
    '98': { country: 'IR', name: '伊朗', timezone: 'Asia/Tehran', flag: '🇮🇷' },
    '212': { 
      country: 'MA_EH', // Morocco and Western Sahara
      name: '摩洛哥地区', 
      timezone: 'Africa/Casablanca', 
      flag: '🇲🇦',
      isShared: true,
      countries: [
        { country: 'MA', name: '摩洛哥', timezone: 'Africa/Casablanca', flag: '🇲🇦' },
        { country: 'EH', name: '西撒哈拉', timezone: 'Africa/El_Aaiun', flag: '🇪🇭' }
      ]
    },
    '213': { country: 'DZ', name: '阿尔及利亚', timezone: 'Africa/Algiers', flag: '🇩🇿' },
    '216': { country: 'TN', name: '突尼斯', timezone: 'Africa/Tunis', flag: '🇹🇳' },
    '218': { country: 'LY', name: '利比亚', timezone: 'Africa/Tripoli', flag: '🇱🇾' },
    '220': { country: 'GM', name: '冈比亚', timezone: 'Africa/Banjul', flag: '🇬🇲' },
    '221': { country: 'SN', name: '塞内加尔', timezone: 'Africa/Dakar', flag: '🇸🇳' },
    '222': { country: 'MR', name: '毛里塔尼亚', timezone: 'Africa/Nouakchott', flag: '🇲🇷' },
    '223': { country: 'ML', name: '马里', timezone: 'Africa/Bamako', flag: '🇲🇱' },
    '224': { country: 'GN', name: '几内亚', timezone: 'Africa/Conakry', flag: '🇬🇳' },
    '225': { country: 'CI', name: '科特迪瓦', timezone: 'Africa/Abidjan', flag: '🇨🇮' },
    '226': { country: 'BF', name: '布基纳法索', timezone: 'Africa/Ouagadougou', flag: '🇧🇫' },
    '227': { country: 'NE', name: '尼日尔', timezone: 'Africa/Niamey', flag: '🇳🇪' },
    '228': { country: 'TG', name: '多哥', timezone: 'Africa/Lome', flag: '🇹🇬' },
    '229': { country: 'BJ', name: '贝宁', timezone: 'Africa/Porto-Novo', flag: '🇧🇯' },
    '230': { country: 'MU', name: '毛里求斯', timezone: 'Indian/Mauritius', flag: '🇲🇺' },
    '231': { country: 'LR', name: '利比里亚', timezone: 'Africa/Monrovia', flag: '🇱🇷' },
    '232': { country: 'SL', name: '塞拉利昂', timezone: 'Africa/Freetown', flag: '🇸🇱' },
    '233': { country: 'GH', name: '加纳', timezone: 'Africa/Accra', flag: '🇬🇭' },
    '234': { country: 'NG', name: '尼日利亚', timezone: 'Africa/Lagos', flag: '🇳🇬' },
    '235': { country: 'TD', name: '乍得', timezone: 'Africa/Ndjamena', flag: '🇹🇩' },
    '236': { country: 'CF', name: '中非', timezone: 'Africa/Bangui', flag: '🇨🇫' },
    '237': { country: 'CM', name: '喀麦隆', timezone: 'Africa/Douala', flag: '🇨🇲' },
    '238': { country: 'CV', name: '佛得角', timezone: 'Atlantic/Cape_Verde', flag: '🇨🇻' },
    '239': { country: 'ST', name: '圣多美和普林西比', timezone: 'Africa/Sao_Tome', flag: '🇸🇹' },
    '240': { country: 'GQ', name: '赤道几内亚', timezone: 'Africa/Malabo', flag: '🇬🇶' },
    '241': { country: 'GA', name: '加蓬', timezone: 'Africa/Libreville', flag: '🇬🇦' },
    '242': { country: 'CG', name: '刚果', timezone: 'Africa/Brazzaville', flag: '🇨🇬' },
    '243': { country: 'CD', name: '刚果民主共和国', timezone: 'Africa/Kinshasa', flag: '🇨🇩' },
    '244': { country: 'AO', name: '安哥拉', timezone: 'Africa/Luanda', flag: '🇦🇴' },
    '245': { country: 'GW', name: '几内亚比绍', timezone: 'Africa/Bissau', flag: '🇬🇼' },
    '246': { country: 'IO', name: '英属印度洋领地', timezone: 'Indian/Chagos', flag: '🇮🇴' },
    '248': { country: 'SC', name: '塞舌尔', timezone: 'Indian/Mahe', flag: '🇸🇨' },
    '249': { country: 'SD', name: '苏丹', timezone: 'Africa/Khartoum', flag: '🇸🇩' },
    '250': { country: 'RW', name: '卢旺达', timezone: 'Africa/Kigali', flag: '🇷🇼' },
    '251': { country: 'ET', name: '埃塞俄比亚', timezone: 'Africa/Addis_Ababa', flag: '🇪🇹' },
    '252': { country: 'SO', name: '索马里', timezone: 'Africa/Mogadishu', flag: '🇸🇴' },
    '253': { country: 'DJ', name: '吉布提', timezone: 'Africa/Djibouti', flag: '🇩🇯' },
    '254': { country: 'KE', name: '肯尼亚', timezone: 'Africa/Nairobi', flag: '🇰🇪' },
    '255': { country: 'TZ', name: '坦桑尼亚', timezone: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
    '256': { country: 'UG', name: '乌干达', timezone: 'Africa/Kampala', flag: '🇺🇬' },
    '257': { country: 'BI', name: '布隆迪', timezone: 'Africa/Bujumbura', flag: '🇧🇮' },
    '258': { country: 'MZ', name: '莫桑比克', timezone: 'Africa/Maputo', flag: '🇲🇿' },
    '260': { country: 'ZM', name: '赞比亚', timezone: 'Africa/Lusaka', flag: '🇿🇲' },
    '261': { country: 'MG', name: '马达加斯加', timezone: 'Indian/Antananarivo', flag: '🇲🇬' },
    '262': { 
      country: 'RE_YT', // Réunion and Mayotte
      name: '法属印度洋', 
      timezone: 'Indian/Reunion', 
      flag: '🇫🇷',
      isShared: true,
      countries: [
        { country: 'RE', name: '留尼汪', timezone: 'Indian/Reunion', flag: '🇷🇪' },
        { country: 'YT', name: '马约特', timezone: 'Indian/Mayotte', flag: '🇾🇹' }
      ]
    },
    '263': { country: 'ZW', name: '津巴布韦', timezone: 'Africa/Harare', flag: '🇿🇼' },
    '264': { country: 'NA', name: '纳米比亚', timezone: 'Africa/Windhoek', flag: '🇳🇦' },
    '265': { country: 'MW', name: '马拉维', timezone: 'Africa/Blantyre', flag: '🇲🇼' },
    '266': { country: 'LS', name: '莱索托', timezone: 'Africa/Maseru', flag: '🇱🇸' },
    '267': { country: 'BW', name: '博茨瓦纳', timezone: 'Africa/Gaborone', flag: '🇧🇼' },
    '268': { country: 'SZ', name: '斯威士兰', timezone: 'Africa/Mbabane', flag: '🇸🇿' },
    '269': { country: 'KM', name: '科摩罗', timezone: 'Indian/Comoro', flag: '🇰🇲' },
    '290': { country: 'SH', name: '圣赫勒拿', timezone: 'Atlantic/St_Helena', flag: '🇸🇭' },
    '291': { country: 'ER', name: '厄立特里亚', timezone: 'Africa/Asmara', flag: '🇪🇷' },
    '297': { country: 'AW', name: '阿鲁巴', timezone: 'America/Aruba', flag: '🇦🇼' },
    '298': { country: 'FO', name: '法罗群岛', timezone: 'Atlantic/Faroe', flag: '🇫🇴' },
    '299': { country: 'GL', name: '格陵兰', timezone: 'America/Godthab', flag: '🇬🇱' },
    '350': { country: 'GI', name: '直布罗陀', timezone: 'Europe/Gibraltar', flag: '🇬🇮' },
    '351': { country: 'PT', name: '葡萄牙', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
    '352': { country: 'LU', name: '卢森堡', timezone: 'Europe/Luxembourg', flag: '🇱🇺' },
    '353': { country: 'IE', name: '爱尔兰', timezone: 'Europe/Dublin', flag: '🇮🇪' },
    '354': { country: 'IS', name: '冰岛', timezone: 'Atlantic/Reykjavik', flag: '🇮🇸' },
    '355': { country: 'AL', name: '阿尔巴尼亚', timezone: 'Europe/Tirane', flag: '🇦🇱' },
    '356': { country: 'MT', name: '马耳他', timezone: 'Europe/Malta', flag: '🇲🇹' },
    '357': { country: 'CY', name: '塞浦路斯', timezone: 'Asia/Nicosia', flag: '🇨🇾' },
    '358': { country: 'FI', name: '芬兰', timezone: 'Europe/Helsinki', flag: '🇫🇮' },
    '359': { country: 'BG', name: '保加利亚', timezone: 'Europe/Sofia', flag: '🇧🇬' },
    '370': { country: 'LT', name: '立陶宛', timezone: 'Europe/Vilnius', flag: '🇱🇹' },
    '371': { country: 'LV', name: '拉脱维亚', timezone: 'Europe/Riga', flag: '🇱🇻' },
    '372': { country: 'EE', name: '爱沙尼亚', timezone: 'Europe/Tallinn', flag: '🇪🇪' },
    '373': { country: 'MD', name: '摩尔多瓦', timezone: 'Europe/Chisinau', flag: '🇲🇩' },
    '374': { country: 'AM', name: '亚美尼亚', timezone: 'Asia/Yerevan', flag: '🇦🇲' },
    '375': { country: 'BY', name: '白俄罗斯', timezone: 'Europe/Minsk', flag: '🇧🇾' },
    '376': { country: 'AD', name: '安道尔', timezone: 'Europe/Andorra', flag: '🇦🇩' },
    '377': { country: 'MC', name: '摩纳哥', timezone: 'Europe/Monaco', flag: '🇲🇨' },
    '378': { country: 'SM', name: '圣马力诺', timezone: 'Europe/San_Marino', flag: '🇸🇲' },
    '380': { country: 'UA', name: '乌克兰', timezone: 'Europe/Kiev', flag: '🇺🇦' },
    '381': { country: 'RS', name: '塞尔维亚', timezone: 'Europe/Belgrade', flag: '🇷🇸' },
    '382': { country: 'ME', name: '黑山', timezone: 'Europe/Podgorica', flag: '🇲🇪' },
    '383': { country: 'XK', name: '科索沃', timezone: 'Europe/Pristina', flag: '🇽🇰' },
    '385': { country: 'HR', name: '克罗地亚', timezone: 'Europe/Zagreb', flag: '🇭🇷' },
    '386': { country: 'SI', name: '斯洛文尼亚', timezone: 'Europe/Ljubljana', flag: '🇸🇮' },
    '387': { country: 'BA', name: '波斯尼亚和黑塞哥维那', timezone: 'Europe/Sarajevo', flag: '🇧🇦' },
    '389': { country: 'MK', name: '北马其顿', timezone: 'Europe/Skopje', flag: '🇲🇰' },
    '420': { country: 'CZ', name: '捷克', timezone: 'Europe/Prague', flag: '🇨🇿' },
    '421': { country: 'SK', name: '斯洛伐克', timezone: 'Europe/Bratislava', flag: '🇸🇰' },
    '423': { country: 'LI', name: '列支敦士登', timezone: 'Europe/Vaduz', flag: '🇱🇮' },
    '500': { country: 'FK', name: '福克兰群岛', timezone: 'Atlantic/Stanley', flag: '🇫🇰' },
    '501': { country: 'BZ', name: '伯利兹', timezone: 'America/Belize', flag: '🇧🇿' },
    '502': { country: 'GT', name: '危地马拉', timezone: 'America/Guatemala', flag: '🇬🇹' },
    '503': { country: 'SV', name: '萨尔瓦多', timezone: 'America/El_Salvador', flag: '🇸🇻' },
    '504': { country: 'HN', name: '洪都拉斯', timezone: 'America/Tegucigalpa', flag: '🇭🇳' },
    '505': { country: 'NI', name: '尼加拉瓜', timezone: 'America/Managua', flag: '🇳🇮' },
    '506': { country: 'CR', name: '哥斯达黎加', timezone: 'America/Costa_Rica', flag: '🇨🇷' },
    '507': { country: 'PA', name: '巴拿马', timezone: 'America/Panama', flag: '🇵🇦' },
    '508': { country: 'PM', name: '圣皮埃尔和密克隆', timezone: 'America/Miquelon', flag: '🇵🇲' },
    '509': { country: 'HT', name: '海地', timezone: 'America/Port-au-Prince', flag: '🇭🇹' },
    '590': { 
      country: 'GP_BL_MF', // Guadeloupe, Saint Barthélemy, Saint Martin
      name: '法属安的列斯', 
      timezone: 'America/Guadeloupe', 
      flag: '🇫🇷',
      isShared: true,
      countries: [
        { country: 'GP', name: '瓜德罗普', timezone: 'America/Guadeloupe', flag: '🇬🇵' },
        { country: 'BL', name: '圣巴泰勒米', timezone: 'America/St_Barthelemy', flag: '🇧🇱' },
        { country: 'MF', name: '法属圣马丁', timezone: 'America/Marigot', flag: '🇲🇫' }
      ]
    },
    '591': { country: 'BO', name: '玻利维亚', timezone: 'America/La_Paz', flag: '🇧🇴' },
    '592': { country: 'GY', name: '圭亚那', timezone: 'America/Guyana', flag: '🇬🇾' },
    '593': { country: 'EC', name: '厄瓜多尔', timezone: 'America/Guayaquil', flag: '🇪🇨' },
    '594': { country: 'GF', name: '法属圭亚那', timezone: 'America/Cayenne', flag: '🇬🇫' },
    '595': { country: 'PY', name: '巴拉圭', timezone: 'America/Asuncion', flag: '🇵🇾' },
    '596': { country: 'MQ', name: '马提尼克', timezone: 'America/Martinique', flag: '🇲🇶' },
    '597': { country: 'SR', name: '苏里南', timezone: 'America/Paramaribo', flag: '🇸🇷' },
    '598': { country: 'UY', name: '乌拉圭', timezone: 'America/Montevideo', flag: '🇺🇾' },
    '599': { 
      country: 'CW_BQ', // Curaçao and Caribbean Netherlands
      name: '荷属安的列斯', 
      timezone: 'America/Curacao', 
      flag: '🇳🇱',
      isShared: true,
      countries: [
        { country: 'CW', name: '库拉索', timezone: 'America/Curacao', flag: '🇨🇼' },
        { country: 'BQ', name: '荷属加勒比', timezone: 'America/Kralendijk', flag: '🇧🇶' }
      ]
    },
    '670': { country: 'TL', name: '东帝汶', timezone: 'Asia/Dili', flag: '🇹🇱' },
    '672': { country: 'AQ', name: '南极洲', timezone: 'Antarctica/McMurdo', flag: '🇦🇶' },
    '673': { country: 'BN', name: '文莱', timezone: 'Asia/Brunei', flag: '🇧🇳' },
    '674': { country: 'NR', name: '瑙鲁', timezone: 'Pacific/Nauru', flag: '🇳🇷' },
    '675': { country: 'PG', name: '巴布亚新几内亚', timezone: 'Pacific/Port_Moresby', flag: '🇵🇬' },
    '676': { country: 'TO', name: '汤加', timezone: 'Pacific/Tongatapu', flag: '🇹🇴' },
    '677': { country: 'SB', name: '所罗门群岛', timezone: 'Pacific/Guadalcanal', flag: '🇸🇧' },
    '678': { country: 'VU', name: '瓦努阿图', timezone: 'Pacific/Efate', flag: '🇻🇺' },
    '679': { country: 'FJ', name: '斐济', timezone: 'Pacific/Fiji', flag: '🇫🇯' },
    '680': { country: 'PW', name: '帕劳', timezone: 'Pacific/Palau', flag: '🇵🇼' },
    '681': { country: 'WF', name: '瓦利斯和富图纳', timezone: 'Pacific/Wallis', flag: '🇼🇫' },
    '682': { country: 'CK', name: '库克群岛', timezone: 'Pacific/Rarotonga', flag: '🇨🇰' },
    '683': { country: 'NU', name: '纽埃', timezone: 'Pacific/Niue', flag: '🇳🇺' },
    '684': { country: 'AS', name: '美属萨摩亚', timezone: 'Pacific/Pago_Pago', flag: '🇦🇸' },
    '685': { country: 'WS', name: '萨摩亚', timezone: 'Pacific/Apia', flag: '🇼🇸' },
    '686': { country: 'KI', name: '基里巴斯', timezone: 'Pacific/Tarawa', flag: '🇰🇮' },
    '687': { country: 'NC', name: '新喀里多尼亚', timezone: 'Pacific/Noumea', flag: '🇳🇨' },
    '688': { country: 'TV', name: '图瓦卢', timezone: 'Pacific/Funafuti', flag: '🇹🇻' },
    '689': { country: 'PF', name: '法属波利尼西亚', timezone: 'Pacific/Tahiti', flag: '🇵🇫' },
    '690': { country: 'TK', name: '托克劳', timezone: 'Pacific/Fakaofo', flag: '🇹🇰' },
    '691': { country: 'FM', name: '密克罗尼西亚', timezone: 'Pacific/Chuuk', flag: '🇫🇲' },
    '692': { country: 'MH', name: '马绍尔群岛', timezone: 'Pacific/Majuro', flag: '🇲🇭' },
    '850': { country: 'KP', name: '朝鲜', timezone: 'Asia/Pyongyang', flag: '🇰🇵' },
    '852': { country: 'HK', name: '香港', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
    '853': { country: 'MO', name: '澳门', timezone: 'Asia/Macau', flag: '🇲🇴' },
    '855': { country: 'KH', name: '柬埔寨', timezone: 'Asia/Phnom_Penh', flag: '🇰🇭' },
    '856': { country: 'LA', name: '老挝', timezone: 'Asia/Vientiane', flag: '🇱🇦' },
    '880': { country: 'BD', name: '孟加拉国', timezone: 'Asia/Dhaka', flag: '🇧🇩' },
    '886': { country: 'TW', name: '台湾', timezone: 'Asia/Taipei', flag: '🇹🇼' },
    '960': { country: 'MV', name: '马尔代夫', timezone: 'Indian/Maldives', flag: '🇲🇻' },
    '961': { country: 'LB', name: '黎巴嫩', timezone: 'Asia/Beirut', flag: '🇱🇧' },
    '962': { country: 'JO', name: '约旦', timezone: 'Asia/Amman', flag: '🇯🇴' },
    '963': { country: 'SY', name: '叙利亚', timezone: 'Asia/Damascus', flag: '🇸🇾' },
    '964': { country: 'IQ', name: '伊拉克', timezone: 'Asia/Baghdad', flag: '🇮🇶' },
    '965': { country: 'KW', name: '科威特', timezone: 'Asia/Kuwait', flag: '🇰🇼' },
    '966': { country: 'SA', name: '沙特阿拉伯', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
    '967': { country: 'YE', name: '也门', timezone: 'Asia/Aden', flag: '🇾🇪' },
    '968': { country: 'OM', name: '阿曼', timezone: 'Asia/Muscat', flag: '🇴🇲' },
    '970': { country: 'PS', name: '巴勒斯坦', timezone: 'Asia/Gaza', flag: '🇵🇸' },
    '971': { country: 'AE', name: '阿联酋', timezone: 'Asia/Dubai', flag: '🇦🇪' },
    '972': { country: 'IL', name: '以色列', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },
    '973': { country: 'BH', name: '巴林', timezone: 'Asia/Bahrain', flag: '🇧🇭' },
    '974': { country: 'QA', name: '卡塔尔', timezone: 'Asia/Qatar', flag: '🇶🇦' },
    '975': { country: 'BT', name: '不丹', timezone: 'Asia/Thimphu', flag: '🇧🇹' },
    '976': { country: 'MN', name: '蒙古', timezone: 'Asia/Ulaanbaatar', flag: '🇲🇳' },
    '977': { country: 'NP', name: '尼泊尔', timezone: 'Asia/Kathmandu', flag: '🇳🇵' },
    '992': { country: 'TJ', name: '塔吉克斯坦', timezone: 'Asia/Dushanbe', flag: '🇹🇯' },
    '993': { country: 'TM', name: '土库曼斯坦', timezone: 'Asia/Ashgabat', flag: '🇹🇲' },
    '994': { country: 'AZ', name: '阿塞拜疆', timezone: 'Asia/Baku', flag: '🇦🇿' },
    '995': { country: 'GE', name: '格鲁吉亚', timezone: 'Asia/Tbilisi', flag: '🇬🇪' },
    '996': { country: 'KG', name: '吉尔吉斯斯坦', timezone: 'Asia/Bishkek', flag: '🇰🇬' },
    '998': { country: 'UZ', name: '乌兹别克斯坦', timezone: 'Asia/Tashkent', flag: '🇺🇿' }
  },

  // 当前显示的天气信息元素
  currentWeatherElement: null,
  currentPhoneNumber: null,
  
  // 调试状态（避免重复输出）
  lastDebugNumber: null,
  
  // 实时时钟定时器
  clockInterval: null,
  
  // 用户手动修正的国家信息缓存
  userCorrections: new Map(),
  
  // 智能识别缓存 (基于号码段)
  numberPatterns: new Map(),

  // 创建或更新状态显示
  showStatus: function(status, message = null) {
    const statusText = message || this.statusMessages[status] || '📊 状态未知';
    if (this.currentStatus === status && this.currentInfoElement && this.currentInfoElement.textContent === statusText) {
      return this.currentInfoElement;
    }

    this.currentStatus = status;
    console.log(`📊 天气信息状态: ${status} - ${statusText}`);
    
    // 如果已有元素，更新内容
    if (this.currentInfoElement) {
      this.currentInfoElement.textContent = statusText;
      this.currentInfoElement.className = `weather-info-status status-${status}`;
      this.updateStatusStyle(this.currentInfoElement, status);
      return this.currentInfoElement;
    }
    
    // 创建新的状态元素
    const statusElement = document.createElement('div');
    statusElement.className = `weather-info-status status-${status}`;
    statusElement.textContent = statusText;
    this.updateStatusStyle(statusElement, status);
    
    this.currentInfoElement = statusElement;
    return statusElement;
  },

  // 更新状态样式
  updateStatusStyle: function(element, status) {
    element.style.cssText = `
      padding: 8px 12px;
      margin: 5px 0;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      background: ${this.getStatusColor(status)};
      color: ${status === 'loading' ? '#666' : '#333'};
      border: 1px solid ${this.getStatusBorderColor(status)};
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    // 添加加载动画
    if (status === 'loading') {
      this.addLoadingAnimation(element);
    } else {
      element.style.animation = 'none';
    }
  },

  // 获取状态对应的背景色
  getStatusColor: function(status) {
    const colors = {
      loading: '#f0f8ff',
      error: '#ffe6e6',
      'no-number': '#fff5e6',
      'no-contact': '#f5f5f5',
      success: '#e6ffe6',
      idle: '#f5f5f5'
    };
    return colors[status] || colors.idle;
  },

  // 获取状态对应的边框色
  getStatusBorderColor: function(status) {
    const colors = {
      loading: '#4a90e2',
      error: '#e74c3c',
      'no-number': '#f39c12',
      'no-contact': '#95a5a6',
      success: '#27ae60',
      idle: '#bdc3c7'
    };
    return colors[status] || colors.idle;
  },

  // 添加动画效果
  addLoadingAnimation: function(element) {
    if (this.currentStatus === 'loading') {
      element.style.animation = 'pulse 1.5s ease-in-out infinite';
      
      // 添加CSS动画样式（如果还没有）
      this.ensureAnimationStyles();
    }
  },

  // 确保动画样式存在
  ensureAnimationStyles: function() {
    if (!document.querySelector('#weather-status-animations')) {
      const style = document.createElement('style');
      style.id = 'weather-status-animations';
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .weather-info-status {
          transition: all 0.3s ease;
        }
        .weather-info-status:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `;
      document.head.appendChild(style);
    }
  },

  // 插入状态到聊天窗口
  insertStatus: function(container = null) {
    console.log('🌤️ 插入状态信息到聊天窗口...');
    
    // 查找合适的插入位置
    let insertPosition = container || this.findInsertionContainer();
    
    if (!insertPosition) {
      console.log('❌ 未找到合适的插入位置');
      this.showStatus('error', '❌ 未找到插入位置');
      return false;
    }

    // 移除已存在的状态信息
    const existingStatus = insertPosition.querySelector('.weather-info-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // 创建并插入新的状态元素
    const statusElement = this.showStatus('loading');
    insertPosition.appendChild(statusElement);
    
    console.log('✅ 状态信息已插入');
    return true;
  },

  // 初始化功能
  init() {
    // 版权保护检查
    if (this.isProtected) {
      console.warn('WeatherInfo: 系统已被保护，停止初始化');
      return;
    }

    if (this.initialized) {
      return;
    }

    this.initialized = true;
    
    console.log('WeatherInfo: 初始化天气信息功能');
    this.loadUserCorrections();
    this.setupChatWindowObserver();
    
    // 初始化注入提示
    setTimeout(() => {
      this.initInjectionIndicator();
    }, 2000); // 延迟2秒确保页面完全加载
  },
  
  // 停止所有功能
  stop() {
    console.log('WeatherInfo: 停止所有功能');
    this.isProtected = true;
    
    // 清除所有观察器
    if (this.chatWindowObserver) {
      this.chatWindowObserver.disconnect();
      this.chatWindowObserver = null;
    }
    if (this.currentInfoElement) {
      this.currentInfoElement.remove();
    }
    if (this.injectionIndicator) {
      this.injectionIndicator.remove();
    }
    
    // 清除所有定时器
    clearTimeout(this.loadingTimeout);
    clearTimeout(this.retryTimeout);
  },
  
  // 加载用户修正的国家信息
  async loadUserCorrections() {
    try {
      const result = await chrome.storage.local.get(['weatherCountryCorrections']);
      if (result.weatherCountryCorrections) {
        this.userCorrections = new Map(Object.entries(result.weatherCountryCorrections));
        console.log('WeatherInfo: 加载用户修正信息:', this.userCorrections.size, '条记录');
      }
    } catch (error) {
      console.warn('WeatherInfo: 加载用户修正信息失败:', error);
    }
  },
  
  // 保存用户修正的国家信息
  async saveUserCorrections() {
    try {
      const corrections = Object.fromEntries(this.userCorrections);
      await chrome.storage.local.set({ weatherCountryCorrections: corrections });
      console.log('WeatherInfo: 保存用户修正信息成功');
    } catch (error) {
      console.error('WeatherInfo: 保存用户修正信息失败:', error);
    }
  },

  isChatWindowActive() {
    const main = document.getElementById('main');
    if (!main) return false;

    // 有输入框通常表示已经进入某个会话
    if (document.querySelector('footer._ak1i')) return true;

    // 有消息/会话相关 data-id（减少误判）
    if (main.querySelector('[data-id*="@c.us"], [data-id*="@g.us"]')) return true;

    // 有会话 header（不同版本 WhatsApp 可能不同）
    if (main.querySelector('header[data-testid="conversation-info-header"], header [data-testid="conversation-info-header"]')) return true;

    return false;
  },

  // 设置聊天窗口观察器
  setupChatWindowObserver() {
    if (this.observerInitialized && this.chatWindowObserver) {
      return;
    }

    this.observerInitialized = true;

    // 监听聊天窗口切换 - 使用防抖机制减少频繁触发
    let debounceTimeout = null;
    const observer = new MutationObserver((mutations) => {
      // 清除之前的定时器
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      // 只有当变化涉及到main区域时才检查
      const hasMainChange = mutations.some(mutation => 
        mutation.target.id === 'main' || 
        mutation.target.closest('#main') ||
        (mutation.addedNodes && Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && (node.id === 'main' || node.querySelector('#main'))
        ))
      );
      
      if (hasMainChange) {
        // 防抖：500ms内只触发一次
        debounceTimeout = setTimeout(() => {
          this.checkForNewChatWindow();
        }, 500);
      }
    });

    this.chatWindowObserver = observer;

    // 开始观察 - 只观察主要区域
    const mainElement = document.getElementById('main');
    if (mainElement) {
      observer.observe(mainElement, {
        childList: true,
        subtree: true
      });
    } else {
      // 如果main元素还没加载，观察整个body但更加精确
      observer.observe(document.body, {
        childList: true,
        subtree: false // 只观察直接子元素
      });
    }

    // 初始检查
    setTimeout(() => this.checkForNewChatWindow(), 1000);
  },

  // 检查新的聊天窗口
  checkForNewChatWindow() {
    const nowMs = Date.now();
    if (nowMs - (this.lastChatCheckAt || 0) < 800) {
      return;
    }
    this.lastChatCheckAt = nowMs;

    if (!this.isChatWindowActive()) {
      const now = Date.now();
      if (now - (this.lastNoContactShownAt || 0) > 5000) {
        this.showStatus('no-contact');
        this.lastNoContactShownAt = now;
      }
      return;
    }

    console.log('🔍 检查新聊天窗口...');
    
    // 立即显示加载状态
    setTimeout(() => {
      if (this.insertStatus()) {
        // 状态插入成功后，延迟执行号码提取
        setTimeout(() => {
          this.extractPhoneNumber();
        }, 200);
      } else {
        // 如果无法插入状态，直接执行号码提取
        this.extractPhoneNumber();
      }
    }, 100);
  },

  // 从当前聊天窗口提取电话号码
  extractPhoneNumber() {
    const nowMs = Date.now();
    if (nowMs - (this.lastExtractAt || 0) < 800) {
      return;
    }
    this.lastExtractAt = nowMs;

    // 版权保护检查
    if (this.isProtected) {
      console.warn('WeatherInfo: 系统已被保护，停止号码提取');
      return;
    }

    if (!this.isChatWindowActive()) {
      const now = Date.now();
      if (now - (this.lastNoContactShownAt || 0) > 5000) {
        this.showStatus('no-contact');
        this.lastNoContactShownAt = now;
      }
      return;
    }
    
    console.log('📞 开始提取电话号码...');
    
    // 使用我们成功测试的方法
    const phoneNumber = this.tryGetWhatsAppNumber();
    
    if (phoneNumber) {
      this.consecutiveNoNumber = 0;
      // 只在号码变化时输出成功信息
      if (this.lastDebugNumber !== phoneNumber) {
        console.log('✅ 成功提取到号码:', phoneNumber);
        this.lastDebugNumber = phoneNumber;
      }
      // processPhoneNumber 已经在 tryGetWhatsAppNumber 中调用了
    } else {
      this.consecutiveNoNumber = (this.consecutiveNoNumber || 0) + 1;

      // WhatsApp DOM 可能短暂抖动：连续多次都拿不到号码才切到 no-number
      if (this.consecutiveNoNumber < 3 && this.currentPhoneNumber) {
        return;
      }

      this.showStatus('no-number');
      
      // 只在之前有号码现在没有号码时输出
      if (this.lastDebugNumber !== null) {
        console.log('❌ 未能提取到号码');
        this.lastDebugNumber = null;
      }
    }
  },

  // 处理电话号码
  processPhoneNumber(phoneNumber) {
    // 保留原始格式用于显示，提取数字用于识别
    const originalNumber = phoneNumber.trim();
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, ''); // 保留+号
    const numbersOnly = phoneNumber.replace(/[^\d]/g, ''); // 仅数字用于比较
    
    // 如果号码没有变化，不需要重新获取信息
    if (this.currentPhoneNumber === numbersOnly) {
      return; // 静默跳过，不输出重复信息
    }
    
    console.log('WeatherInfo: 处理电话号码:', phoneNumber);
    
    this.currentPhoneNumber = numbersOnly;
    
    // 识别国家（使用仅数字的版本）
    const countryInfo = this.identifyCountry(numbersOnly);
    if (countryInfo) {
      console.log('WeatherInfo: 识别到国家:', countryInfo);
      // 添加原始号码信息用于显示
      countryInfo.originalNumber = originalNumber;
      this.displayWeatherInfo(countryInfo);
    } else {
      console.log('WeatherInfo: 无法识别国家');
      this.hideWeatherInfo();
    }
  },

  // 识别国家
  identifyCountry(phoneNumber) {
    // 首先检查用户是否已手动修正过此号码
    if (this.userCorrections.has(phoneNumber)) {
      const correction = this.userCorrections.get(phoneNumber);
      console.log('WeatherInfo: 使用用户修正的国家信息:', correction);
      return {
        ...correction,
        phoneNumber: phoneNumber,
        isUserCorrected: true
      };
    }
    
    // 尝试匹配不同长度的区号
    for (let i = 1; i <= 4; i++) {
      const prefix = phoneNumber.substring(0, i);
      if (this.countryCodeMap[prefix]) {
        const countryData = this.countryCodeMap[prefix];
        
        // 如果是共享区号，尝试智能识别
        if (countryData.isShared) {
          return this.handleSharedCountryCode(phoneNumber, prefix, countryData);
        }
        
        return {
          ...countryData,
          prefix: prefix,
          phoneNumber: phoneNumber
        };
      }
    }
    return null;
  },
  
  // 处理共享区号的智能识别
  handleSharedCountryCode(phoneNumber, prefix, countryData) {
    // +1区号的特殊处理 (北美编号计划)
    if (prefix === '1' && phoneNumber.length >= 4) {
      const areaCode = phoneNumber.substring(1, 4);
      
      // 加拿大的主要区号
      const canadianAreaCodes = [
        '204', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', 
        '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', 
        '672', '705', '709', '742', '778', '780', '782', '807', '819', '825', '867', '873', '902', 
        '905', '867'
      ];
      
      // 检查是否为加拿大区号
      if (canadianAreaCodes.includes(areaCode)) {
        const canadaInfo = countryData.countries.find(c => c.country === 'CA');
        return {
          ...canadaInfo,
          prefix: prefix,
          phoneNumber: phoneNumber,
          isAutoDetected: true,
          detectionMethod: 'area_code'
        };
      }
    }
    
    // +7区号的特殊处理 (俄罗斯/哈萨克斯坦)
    if (prefix === '7' && phoneNumber.length >= 4) {
      const firstDigit = phoneNumber.charAt(1);
      
      // 哈萨克斯坦通常以76, 77开头
      if (firstDigit === '6' || firstDigit === '7') {
        const secondDigit = phoneNumber.charAt(2);
        if ((firstDigit === '7' && ['0','1','2','3','4','5','6','7','8'].includes(secondDigit)) ||
            (firstDigit === '6' && ['0','1','2','3','4','5','6','7','8','9'].includes(secondDigit))) {
          const kazakhstanInfo = countryData.countries.find(c => c.country === 'KZ');
          if (kazakhstanInfo) {
            return {
              ...kazakhstanInfo,
              prefix: prefix,
              phoneNumber: phoneNumber,
              isAutoDetected: true,
              detectionMethod: 'number_pattern'
            };
          }
        }
      }
    }
    
    // +44区号的特殊处理 (英国及其属地)
    if (prefix === '44' && phoneNumber.length >= 6) {
      const areaCode = phoneNumber.substring(2, 5);
      
      // 泽西岛区号: 1534
      if (areaCode === '153') {
        const jerseyInfo = countryData.countries.find(c => c.country === 'JE');
        if (jerseyInfo) {
          return {
            ...jerseyInfo,
            prefix: prefix,
            phoneNumber: phoneNumber,
            isAutoDetected: true,
            detectionMethod: 'area_code'
          };
        }
      }
      
      // 根西岛区号: 1481
      if (areaCode === '148') {
        const guernseyInfo = countryData.countries.find(c => c.country === 'GG');
        if (guernseyInfo) {
          return {
            ...guernseyInfo,
            prefix: prefix,
            phoneNumber: phoneNumber,
            isAutoDetected: true,
            detectionMethod: 'area_code'
          };
        }
      }
      
      // 马恩岛区号: 1624
      if (areaCode === '162') {
        const isleOfManInfo = countryData.countries.find(c => c.country === 'IM');
        if (isleOfManInfo) {
          return {
            ...isleOfManInfo,
            prefix: prefix,
            phoneNumber: phoneNumber,
            isAutoDetected: true,
            detectionMethod: 'area_code'
          };
        }
      }
    }
    
    // 默认返回第一个国家，但标记为需要确认
    const defaultCountry = countryData.countries[0];
    return {
      ...defaultCountry,
      prefix: prefix,
      phoneNumber: phoneNumber,
      needsConfirmation: true,
      sharedCountryData: countryData
    };
  },

  // 显示天气信息
  async displayWeatherInfo(countryInfo) {
    // 版权保护检查
    if (this.isProtected) {
      console.warn('WeatherInfo: 系统已被保护，停止天气信息显示');
      return;
    }
    
    console.log('WeatherInfo: 显示天气信息:', countryInfo);
    
    try {
      // 显示国家识别状态
      this.showStatus('loading', '🌍 正在识别国家信息...');
      
      // 立即获取并显示时间信息（这个很快）
      const localTime = this.getLocalTime(countryInfo.timezone);
      
      // 先创建基础显示（国家 + 时间，无天气）
      this.createWeatherDisplay(countryInfo, null, localTime);
      
      // 更新状态为正在获取天气
      this.showStatus('loading', '🌤️ 正在获取天气信息...');
      
      // 异步获取天气信息，不阻塞界面
      this.loadWeatherDataAsync(countryInfo);
      
    } catch (error) {
      console.error('WeatherInfo: 显示基础信息失败:', error);
      
      // 显示错误状态
      this.showStatus('error', '❌ 信息加载失败');
      
      // 尝试至少显示时间信息
      try {
        const localTime = this.getLocalTime(countryInfo.timezone);
        this.createWeatherDisplay(countryInfo, null, localTime);
      } catch (timeError) {
        console.error('WeatherInfo: 连时间信息也获取失败:', timeError);
      }
    }
  },

  // 异步加载天气数据
  async loadWeatherDataAsync(countryInfo) {
    try {
      console.log('WeatherInfo: 开始异步加载天气数据...');
      
      // 获取天气数据
      const weatherData = await this.getWeatherData(countryInfo);
      
      if (weatherData) {
        // 更新现有显示，添加天气信息
        this.updateWeatherDisplay(weatherData);
        this.showStatus('success', '✅ 天气信息加载完成');
      } else {
        console.warn('WeatherInfo: 天气数据获取失败，保持基础显示');
        this.showStatus('error', '⚠️ 天气信息获取失败');
      }
      
    } catch (error) {
      console.error('WeatherInfo: 异步加载天气数据失败:', error);
      this.showStatus('error', '⚠️ 天气信息获取失败');
      
      // 可以选择显示默认天气信息
      try {
        const defaultWeather = this.getDefaultWeatherData(countryInfo);
        this.updateWeatherDisplay(defaultWeather);
      } catch (defaultError) {
        console.error('WeatherInfo: 连默认天气数据也获取失败:', defaultError);
      }
    }
  },

  // 获取天气数据 (可配置不同的API)
  async getWeatherData(countryInfo) {
    try {
      // 更新状态为正在获取天气信息
      this.showStatus('loading', '🌤️ 正在获取天气信息...');
      
      // 使用wttr.in API获取天气信息
      const weatherData = await this.getWeatherFromWttr(countryInfo);
      
      if (weatherData && !weatherData.error) {
        this.showStatus('success', '✅ 天气信息获取成功');
        return weatherData;
      } else {
        console.warn('WeatherInfo: wttr.in API返回错误，使用默认数据');
        this.showStatus('error', '⚠️ 使用默认天气信息');
        return this.getDefaultWeatherData(countryInfo);
      }
    } catch (error) {
      console.error('WeatherInfo: 获取天气数据失败:', error);
      this.showStatus('error', '❌ 天气信息获取失败，使用默认数据');
      return this.getDefaultWeatherData(countryInfo);
    }
  },

  // 使用wttr.in获取天气信息
  async getWeatherFromWttr(countryInfo) {
    try {
      // 构建查询位置 - 优先使用国家名称
      const location = countryInfo.name || countryInfo.country;
      const query = encodeURIComponent(location);
      
      // wttr.in的JSON API端点
      const wttrUrl = `https://wttr.in/${query}?format=j1&lang=zh`;
      
      console.log(`WeatherInfo: 正在查询 ${location} 的天气信息...`);
      
      const response = await fetch(wttrUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WeatherInfoExtension/1.0)'
        },
        timeout: 10000 // 10秒超时
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.current_condition && data.current_condition[0]) {
        const current = data.current_condition[0];
        const weather = data.weather && data.weather[0];
        
        // 天气状况映射
        const conditionMap = {
          'Sunny': { desc: '晴朗', icon: '☀️' },
          'Clear': { desc: '晴朗', icon: '☀️' },
          'Partly cloudy': { desc: '多云', icon: '⛅' },
          'Cloudy': { desc: '阴天', icon: '☁️' },
          'Overcast': { desc: '阴天', icon: '☁️' },
          'Light rain': { desc: '小雨', icon: '🌦️' },
          'Moderate rain': { desc: '中雨', icon: '🌧️' },
          'Heavy rain': { desc: '大雨', icon: '🌧️' },
          'Light snow': { desc: '小雪', icon: '🌨️' },
          'Heavy snow': { desc: '大雪', icon: '❄️' },
          'Fog': { desc: '雾', icon: '🌫️' },
          'Mist': { desc: '薄雾', icon: '🌫️' }
        };
        
        const condition = current.weatherDesc[0].value;
        const weatherInfo = conditionMap[condition] || { desc: condition, icon: '🌤️' };
        
        return {
          temperature: parseInt(current.temp_C),
          description: weatherInfo.desc,
          icon: weatherInfo.icon,
          humidity: `${current.humidity}%`,
          windSpeed: `${current.windspeedKmph} km/h`,
          feelsLike: `${current.FeelsLikeC}°C`,
          visibility: `${current.visibility} km`,
          pressure: `${current.pressure} mb`,
          uvIndex: current.uvIndex || 'N/A',
          location: location,
          forecast: weather ? {
            maxTemp: parseInt(weather.maxtempC),
            minTemp: parseInt(weather.mintempC),
            sunrise: weather.astronomy[0].sunrise,
            sunset: weather.astronomy[0].sunset
          } : null
        };
      }
      
      throw new Error('无效的天气数据格式');
      
    } catch (error) {
      console.error('WeatherInfo: wttr.in API调用失败:', error);
      throw error;
    }
  },

  // 获取默认天气数据（备用方案）
  getDefaultWeatherData(countryInfo) {
    // 根据地理位置和季节提供基础的默认天气
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    // 基于国家和季节的简单天气预测
    const isNorthern = !['AU', 'NZ', 'ZA', 'AR', 'CL', 'BR'].includes(countryInfo.country);
    const isSummer = isNorthern ? (month >= 6 && month <= 8) : (month >= 12 || month <= 2);
    const isWinter = isNorthern ? (month >= 12 || month <= 2) : (month >= 6 && month <= 8);
    
    let temperature, description, icon;
    
    if (isSummer) {
      temperature = Math.floor(Math.random() * 10) + 25; // 25-35°C
      description = '晴朗';
      icon = '☀️';
    } else if (isWinter) {
      temperature = Math.floor(Math.random() * 15) + 5; // 5-20°C
      description = '多云';
      icon = '☁️';
    } else {
      temperature = Math.floor(Math.random() * 10) + 18; // 18-28°C
      description = '多云';
      icon = '⛅';
    }
    
    return {
      temperature: temperature,
      description: description,
      icon: icon,
      humidity: `${Math.floor(Math.random() * 30) + 50}%`, // 50-80%
      windSpeed: `${Math.floor(Math.random() * 15) + 5} km/h`, // 5-20 km/h
      location: countryInfo.name,
      isDefault: true
    };
  },

  // 获取当地时间
  getLocalTime(timezone) {
    try {
      const now = new Date();
      const localTime = now.toLocaleString('zh-CN', {
        timeZone: timezone,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{4})\/(\d{2})\/(\d{2})\s/, '').replace(/(\d{2})\/(\d{2})\s/, '$1月$2日 ');
      
      return {
        time: localTime,
        timezone: timezone
      };
    } catch (error) {
      console.error('WeatherInfo: 获取时间失败:', error);
      return {
        time: '无法获取',
        timezone: timezone
      };
    }
  },

  // 启动实时时钟
  startRealtimeClock() {
    // 清除之前的定时器
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    // 每秒更新时间
    this.clockInterval = setInterval(() => {
      const timeElements = document.querySelectorAll('.local-time[data-timezone]');
      timeElements.forEach(element => {
        const timezone = element.getAttribute('data-timezone');
        if (timezone) {
          const timeData = this.getLocalTime(timezone);
          element.textContent = timeData.time;
        }
      });
    }, 1000);
  },

  // 停止实时时钟
  stopRealtimeClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  // 找到电话号码元素，用于在其旁边插入天气信息
  findPhoneNumberElement() {
    console.log('WeatherInfo: 查找电话号码元素...');
    
    // 尝试找到电话号码显示的元素
    const phoneSelectors = [
      // 主要的电话号码选择器
      '#main header span[title*="+"]',
      '#main header [data-testid="conversation-info-header-chat-subtitle"] span[title*="+"]',
      // 包含电话号码的span
      '#main header span[dir="auto"]:has-text("+"):not([class*="status"])',
      // 备用选择器 - 查找包含+号的文本
      '#main header span:contains("+")',
      // 更广泛的搜索
      '#main header *[title*="+"]'
    ];
    
    for (const selector of phoneSelectors) {
      try {
        // 对于包含+号的选择器，需要特殊处理
        if (selector.includes(':contains') || selector.includes(':has-text')) {
          // 手动查找包含+号的元素
          const allSpans = document.querySelectorAll('#main header span');
          for (const span of allSpans) {
            const text = span.textContent || span.title || '';
            if (text.includes('+') && /\+\d+/.test(text)) {
              console.log('✅ 找到电话号码元素:', text);
              return span;
            }
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || element.title || '';
            if (text.includes('+') && /\+\d+/.test(text)) {
              console.log('✅ 找到电话号码元素:', selector, text);
              return element;
            }
          }
        }
      } catch (error) {
        console.log(`❌ 电话号码选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到电话号码元素');
    return null;
  },

  // 查找联系人名称元素（当没有显示电话号码时）
  findContactNameElement() {
    console.log('WeatherInfo: 查找联系人名称元素...');
    
    // 尝试找到联系人名称显示的元素
    const contactSelectors = [
      // 主要的联系人名称选择器
      '#main header [data-testid="conversation-info-header-chat-subtitle"] span[dir="auto"]',
      '#main header span[dir="auto"]:not([class*="status"]):not([title*="+"])',
      // 备用选择器
      '#main header div[data-testid="conversation-info-header-chat-subtitle"] > span',
      '#main header span:not([class*="status"]):not([title*="+"])',
      // 更广泛的搜索
      '#main header div[data-testid="conversation-info-header-chat-subtitle"] *'
    ];
    
    for (const selector of contactSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = (element.textContent || '').trim();
          // 确保不是电话号码、状态信息或空文本
          if (text && 
              !text.includes('+') && 
              !/^\d+$/.test(text) && 
              !text.includes('在线') && 
              !text.includes('最后') &&
              !text.includes('typing') &&
              text.length > 1) {
            console.log('✅ 找到联系人名称元素:', selector, text);
            return element;
          }
        }
      } catch (error) {
        console.log(`❌ 联系人名称选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到联系人名称元素');
    return null;
  },

  // 找到合适的插入位置（电话号码的父容器）
  findInsertionContainer() {
    console.log('WeatherInfo: 查找插入位置...');
    
    const phoneElement = this.findPhoneNumberElement();
    if (!phoneElement) {
      // 如果找不到电话号码，回退到头部容器
      console.log('WeatherInfo: 回退到头部容器...');
      const headerSelectors = [
        '#main header div[data-testid="conversation-info-header-chat-subtitle"]',
        '#main header',
        'header[data-testid="conversation-info-header"]'
      ];
      
      for (const selector of headerSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            console.log('✅ 找到头部容器:', selector);
            return element;
          }
        } catch (error) {
          console.log(`❌ 头部选择器失败: ${selector}`, error.message);
        }
      }
      return null;
    }
    
    // 找到电话号码的父容器，这样我们可以在同一行插入天气信息
    let container = phoneElement.parentElement;
    while (container && !container.matches('#main header div, #main header')) {
      container = container.parentElement;
    }
    
    if (container) {
      console.log('✅ 找到插入容器:', container.tagName, container.className);
      return container;
    }
    
    console.log('❌ 未找到合适的插入容器');
    return null;
  },

  // 获取当前聊天对象的联系人名称
  getCurrentContactName() {
    console.log('WeatherInfo: 获取联系人名称...');
    
    const nameSelectors = [
      // 聊天头部的联系人名称
      '#main header span[title]:not([title*="+"])',
      '#main header [data-testid="conversation-info-header-chat-title"]',
      'header[data-testid="conversation-info-header"] span[title]:not([title*="+"])',
      // 备用选择器
      '#main header span[dir="auto"]:not([dir="auto"]:has([title*="+"]))',
      '#main header .copyable-text span'
    ];
    
    for (const selector of nameSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          let text = element.textContent || element.title || '';
          text = text.trim();
          
          // 过滤掉无关信息
          const invalidPatterns = [
            /最后上线时间/,
            /上次使用时间/,
            /\+\d+/,  // 电话号码
            /online/i,
            /last seen/i,
            /typing/i,
            /正在输入/,
            /^\s*$/   // 空白
          ];
          
          const isValid = text.length > 0 && 
                         text.length < 50 && 
                         !invalidPatterns.some(pattern => pattern.test(text));
          
          if (isValid) {
            console.log('✅ 找到联系人名称:', text);
            return text;
          }
        }
      } catch (error) {
        console.log(`❌ 名称选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 未找到有效的联系人名称');
    return '';
  },

  // 创建天气显示组件
  createWeatherDisplay(countryInfo, weatherData, timeData) {
    // 移除旧的显示元素
    this.hideWeatherInfo();
    
    // 获取联系人名称
    const contactName = this.getCurrentContactName();
    
    // 找到合适的插入位置
    const insertionContainer = this.findInsertionContainer();
    if (!insertionContainer) {
      console.log('WeatherInfo: 未找到合适的插入位置');
      return;
    }
    
    // 创建新的显示元素
    const weatherContainer = document.createElement('div');
    weatherContainer.className = 'wa-weather-info';
    
    // 根据是否需要确认显示不同的内容
    const needsConfirmation = countryInfo.needsConfirmation && !countryInfo.isUserCorrected;
    const isAutoDetected = countryInfo.isAutoDetected;
    const isUserCorrected = countryInfo.isUserCorrected;
    
    weatherContainer.innerHTML = `
      <div class="weather-inline">
        <span class="country-info">
          <span class="country-flag">${countryInfo.flag}</span>
          <span class="country-name">${countryInfo.name}</span>
        </span>
        <span class="weather-info" id="weather-data-container">
          ${weatherData ? this.generateWeatherHTML(weatherData) : '<span class="weather-loading">🌤️ 加载中...</span>'}
        </span>
        ${timeData ? `
        <span class="time-info">
          <span class="time-label">当地时间：</span>
          <span class="local-time" data-timezone="${timeData.timezone}">${timeData.time}</span>
        </span>
        ` : ''}
        ${needsConfirmation ? '<span class="status-indicator needs-confirmation" title="需要确认">?</span>' : ''}
        ${isAutoDetected ? '<span class="status-indicator auto-detected" title="智能识别">🤖</span>' : ''}
        ${isUserCorrected ? '<span class="status-indicator user-corrected" title="用户修正">✓</span>' : ''}
      </div>
      ${needsConfirmation ? `
        <div class="country-selector">
          <div class="selector-hint">请选择正确的国家:</div>
          <div class="country-options">
            ${countryInfo.sharedCountryData.countries.map(country => `
              <button class="country-option" data-country='${JSON.stringify(country)}'>
                ${country.flag} ${country.name}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // 添加样式
    this.addWeatherStyles();
    
    // 将天气信息插入到电话号码或联系人名称旁边
    const phoneElement = this.findPhoneNumberElement();
    if (phoneElement) {
      // 在电话号码后面插入天气信息
      phoneElement.insertAdjacentElement('afterend', weatherContainer);
    } else {
      // 如果找不到电话号码，尝试找到联系人名称元素
      const contactElement = this.findContactNameElement();
      if (contactElement) {
        // 在联系人名称后面插入天气信息
        contactElement.insertAdjacentElement('afterend', weatherContainer);
      } else {
        // 如果都找不到，添加到插入容器的末尾
        insertionContainer.appendChild(weatherContainer);
      }
    }
    this.currentWeatherElement = weatherContainer;
      
      // 如果需要确认，添加国家选择事件
      if (needsConfirmation) {
        this.setupCountrySelection(weatherContainer, countryInfo);
      } else {
        // 添加点击事件来刷新信息
        weatherContainer.addEventListener('click', () => {
          this.refreshWeatherInfo(countryInfo);
        });
      }
      
      // 启动实时时钟
      this.startRealtimeClock();
  },

  // 生成天气HTML片段
  generateWeatherHTML(weatherData) {
    return `
      <span class="weather-icon">${weatherData.icon}</span>
      <span class="temperature">${Math.round(weatherData.temperature)}°</span>
      <span class="weather-desc">${weatherData.description}</span>
      ${weatherData.humidity ? `<span class="humidity">💧${weatherData.humidity}</span>` : ''}
      ${weatherData.windSpeed ? `<span class="wind">💨${weatherData.windSpeed}</span>` : ''}
      ${weatherData.isDefault ? '<span class="default-indicator" title="默认天气数据">📊</span>' : ''}
    `;
  },

  // 更新天气显示（用于异步加载完成后更新）
  updateWeatherDisplay(weatherData) {
    if (!this.currentWeatherElement) {
      console.log('WeatherInfo: 没有找到当前天气元素，无法更新');
      return;
    }

    const weatherContainer = this.currentWeatherElement.querySelector('#weather-data-container');
    if (!weatherContainer) {
      console.log('WeatherInfo: 没有找到天气数据容器，无法更新');
      return;
    }

    // 更新天气信息内容
    weatherContainer.innerHTML = this.generateWeatherHTML(weatherData);
    
    // 添加淡入动画效果
    weatherContainer.style.opacity = '0';
    weatherContainer.style.transition = 'opacity 0.3s ease-in-out';
    
    // 使用requestAnimationFrame确保动画效果
    requestAnimationFrame(() => {
      weatherContainer.style.opacity = '1';
    });

    console.log('WeatherInfo: 天气信息已更新');
  },
  
  // 设置国家选择功能
  setupCountrySelection(container, countryInfo) {
    const countryOptions = container.querySelectorAll('.country-option');
    countryOptions.forEach(option => {
      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        const selectedCountry = JSON.parse(option.dataset.country);
        
        // 保存用户选择
        const correctionKey = countryInfo.phoneNumber;
        const correctionValue = {
          ...selectedCountry,
          prefix: countryInfo.prefix
        };
        
        this.userCorrections.set(correctionKey, correctionValue);
        await this.saveUserCorrections();
        
        console.log('WeatherInfo: 用户选择国家:', selectedCountry.name);
        
        // 重新显示天气信息
        const newCountryInfo = {
          ...correctionValue,
          phoneNumber: countryInfo.phoneNumber,
          isUserCorrected: true
        };
        
        this.displayWeatherInfo(newCountryInfo);
      });
    });
  },

  // 查找天气显示容器的位置
  findWeatherDisplayContainer() {
    // 尝试多个可能的位置
    const selectors = [
      'header[data-testid="conversation-header"]',
      '.chat-header',
      '#main header',
      '[data-testid="chat-header"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    // 如果找不到合适的位置，返回body作为备选
    return document.body;
  },

  // 添加天气信息样式
  addWeatherStyles() {
    if (document.querySelector('#wa-weather-styles')) {
      return; // 样式已存在
    }
    
    const style = document.createElement('style');
    style.id = 'wa-weather-styles';
    style.textContent = `
      .wa-weather-info {
        display: inline-flex;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #8696a0;
        margin: 0 0 0 6px;
        padding: 1px 4px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 6px;
        cursor: default;
        vertical-align: middle;
        line-height: 1.2;
        flex-shrink: 0;
      }
      
       .weather-inline {
         display: flex;
         align-items: center;
         gap: 8px;
         flex-wrap: wrap;
       }
       
       .country-info {
         display: flex;
         align-items: center;
         gap: 4px;
       }
       
       .country-flag {
         font-size: 14px;
       }
       
       .country-name {
         font-size: 13px;
         color: #8696a0;
       }
       
       .weather-info {
         display: flex;
         align-items: center;
         gap: 4px;
         color: #00a884;
       }
       
       .weather-loading {
         font-size: 12px;
         color: #8696a0;
         opacity: 0.8;
         animation: pulse 1.5s infinite;
       }
       
       .weather-icon {
         font-size: 14px;
         margin-right: 2px;
       }
       
       .temperature {
         font-weight: 500;
         font-size: 13px;
       }
       
       .weather-desc {
         font-size: 12px;
         opacity: 0.8;
       }
       
       .humidity, .wind {
         font-size: 11px;
         opacity: 0.7;
         color: #667781;
         display: flex;
         align-items: center;
         gap: 1px;
       }
       
       .default-indicator {
         font-size: 10px;
         opacity: 0.6;
         cursor: help;
       }
       
       .time-info {
         display: flex;
         align-items: center;
         gap: 2px;
         color: #667781;
       }
       
       .time-label {
         font-size: 11px;
         color: #8696a0;
         opacity: 0.8;
       }
       
       .local-time {
         font-size: 12px;
         font-family: monospace;
         font-weight: 500;
         color: #00a884;
       }
       
       .status-indicator {
         font-size: 10px;
         opacity: 0.6;
         margin-left: 4px;
       }
       
       .status-indicator.needs-confirmation {
         color: #ff6b6b;
         animation: pulse 1.5s infinite;
       }
       
       .status-indicator.auto-detected {
         color: #4ecdc4;
       }
       
       .status-indicator.user-corrected {
         color: #00a884;
       }
       
       @keyframes pulse {
         0% { opacity: 1; }
         50% { opacity: 0.5; }
         100% { opacity: 1; }
       }
       
       .country-selector {
         background: #f0f2f5;
         padding: 8px;
         border-radius: 8px;
         margin-top: 4px;
         border: 1px solid #e9edef;
       }
       
       .selector-hint {
         font-size: 12px;
         margin-bottom: 6px;
         color: #667781;
       }
       
       .country-options {
         display: flex;
         flex-wrap: wrap;
         gap: 6px;
       }
       
       .country-option {
         background: white;
         border: 1px solid #d1d7db;
         color: #3b4a54;
         padding: 6px 12px;
         border-radius: 18px;
         font-size: 13px;
         cursor: pointer;
         transition: all 0.2s ease;
         font-family: inherit;
       }
       
       .country-option:hover {
         background: #00a884;
         color: white;
         border-color: #00a884;
       }
       

      
      @media (max-width: 768px) {
        .weather-inline {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
      }
    `;
    
    document.head.appendChild(style);
  },

  // 隐藏天气信息
  hideWeatherInfo() {
    if (this.currentWeatherElement) {
      this.currentWeatherElement.remove();
      this.currentWeatherElement = null;
    }
    
    // 清理状态信息
    if (this.currentInfoElement) {
      this.currentInfoElement.remove();
      this.currentInfoElement = null;
    }
    
    // 重置状态
    this.currentStatus = 'idle';
    
    // 停止实时时钟
    this.stopRealtimeClock();
  },

  // 刷新天气信息
  async refreshWeatherInfo(countryInfo) {
    console.log('WeatherInfo: 刷新天气信息');
    await this.displayWeatherInfo(countryInfo);
  },

  // API配置接口 (供用户配置天气API)
  setWeatherAPI(apiConfig) {
    this.weatherAPIConfig = apiConfig;
    console.log('WeatherInfo: 设置天气API配置:', apiConfig);
  },

  // 测试功能 (开发时使用)
  test(phoneNumber = '8613800138000') {
    console.log('WeatherInfo: 测试功能，使用号码:', phoneNumber);
    this.processPhoneNumber(phoneNumber);
  },
  
  // 尝试从WhatsApp页面获取当前聊天对象号码
  tryGetWhatsAppNumber() {
    if (!this.isChatWindowActive()) {
      return null;
    }
    // 当前聊天对象号码的精确XPath（用户测试成功的路径）
    const currentChatXPath = '//*[@id="main"]/header/div[2]/div/div/div/div/span';
    
    try {
      // 使用精确XPath获取当前聊天对象号码
      const phoneElement = document.evaluate(
        currentChatXPath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      
      if (phoneElement) {
        const phoneText = phoneElement.textContent || phoneElement.innerText;
        
        // 验证是否为有效电话号码格式
        const phoneRegex = /^\+\d{1,3}[\s\d\-\(\)]{8,}$/;
        if (phoneRegex.test(phoneText.trim())) {
          // 只在号码变化时输出详细信息
          const numbersOnly = phoneText.replace(/[^\d]/g, '');
          if (this.currentPhoneNumber !== numbersOnly) {
            console.log('✅ 成功获取当前聊天对象号码!');
            console.log('📞 号码:', phoneText);
            console.log('🎯 开始处理号码...');
          }
          this.processPhoneNumber(phoneText.trim());
          return phoneText.trim();
        } else {
          // 只在不是重复的无效格式时输出日志
          if (this.lastDebugNumber !== 'invalid') {
            console.log('❌ 获取的文本不是有效的电话号码格式:', phoneText);
            console.log('🔄 尝试备用方案...');
          }
          // 总是尝试备用方法，不管是否重复
          const backupResult = this.tryBackupMethods();
          
          // 只有在备用方案也失败时才设置为invalid状态
          if (!backupResult) {
            this.lastDebugNumber = 'invalid';
          }
          
          return backupResult;
        }
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ 获取当前聊天号码时发生错误:', error);
      return null;
    }
  },
  
  // 备用获取方法
  tryBackupMethods() {
    if (!this.isChatWindowActive()) {
      return null;
    }
    console.log('🔄 尝试备用方法获取号码...');
    
    // 首先尝试从聊天记录的data-id属性中提取号码
    console.log('🎯 步骤1: 尝试从聊天记录的data-id中提取号码...');
    const phoneFromDataId = this.extractPhoneFromChatMessages();
    if (phoneFromDataId) {
      console.log('✅ data-id方法成功，返回号码:', phoneFromDataId);
      return phoneFromDataId;
    }
    
    console.log('🎯 步骤2: data-id方法失败，尝试其他备用选择器...');
    
    const backupSelectors = [
      // 主聊天区域的头部号码
      '#main header span[dir="auto"]',
      '#main header [title*="+"]',
      'header[data-testid="conversation-info-header"] span[title*="+"]',
      'header[data-testid="conversation-info-header"] [dir="auto"]'
    ];
    
    for (const selector of backupSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent || element.title || '';
          const phoneRegex = /^\+\d{1,3}[\s\d\-\(\)]{8,}$/;
          
          if (phoneRegex.test(text.trim())) {
            console.log(`✅ 备用方法成功! 选择器: ${selector}`);
            console.log(`📞 号码: ${text.trim()}`);
            this.processPhoneNumber(text.trim());
            return text.trim();
          }
        }
      } catch (error) {
        console.log(`❌ 备用选择器失败: ${selector}`, error.message);
      }
    }
    
    console.log('❌ 所有方法都未能获取到号码');
    return null;
  },

  // 从聊天记录的data-id属性中提取手机号码
  extractPhoneFromChatMessages() {
    if (!this.isChatWindowActive()) {
      return null;
    }
    console.log('🔍 尝试从聊天记录的data-id属性中提取号码...');
    
    try {
      // 查找聊天消息元素，通常包含data-id属性
      // 根据用户提供的xpath: //*[@id="main"]/div[2]/div/div[2]/div[3]/div[4]/div[2]/div
      // 我们需要找到包含data-id的聊天消息元素
      const chatMessageSelectors = [
        // 聊天消息容器的各种可能选择器
        '[data-id*="@c.us"]',  // WhatsApp聊天ID格式
        '#main [data-id*="@c.us"]',  // 在main区域内的聊天消息
        '[data-id*="@g.us"]',  // 群聊格式
        '#main [data-id*="@g.us"]',  // 在main区域内的群聊消息
        // 更具体的聊天消息选择器
        '.message-in [data-id]',
        '.message-out [data-id]',
        '[class*="message"] [data-id]',
        // 聊天容器选择器
        '#main div[data-id]',
        '[tabindex="-1"][data-id]'
      ];
      
      for (const selector of chatMessageSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`🔍 使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (const element of elements) {
            const dataId = element.getAttribute('data-id');
            if (dataId) {
              console.log(`📋 检查data-id: ${dataId}`);
              
              // 从data-id中提取手机号码
              // 格式通常为: false_8618811980135@c.us_3EB01922C8C4EE6B1BA70A
              // 或者: true_8618811980135@c.us_3EB01922C8C4EE6B1BA70A
              const phoneNumber = this.parsePhoneFromDataId(dataId);
              
              if (phoneNumber) {
                console.log(`✅ 从data-id成功提取号码: ${phoneNumber}`);
                console.log(`📞 完整的data-id: ${dataId}`);
                
                // 格式化号码并处理
                const formattedPhone = this.formatPhoneNumber(phoneNumber);
                if (formattedPhone) {
                  this.processPhoneNumber(formattedPhone);
                  return formattedPhone;
                }
              }
            }
          }
        } catch (error) {
          console.log(`❌ 选择器 "${selector}" 执行失败:`, error.message);
        }
      }
      
      console.log('❌ 未能从聊天记录的data-id中找到有效号码');
      return null;
      
    } catch (error) {
      console.error('❌ 从聊天记录提取号码时发生错误:', error);
      return null;
    }
  },

  // 从data-id字符串中解析手机号码
  parsePhoneFromDataId(dataId) {
    if (!dataId || typeof dataId !== 'string') {
      return null;
    }
    
    try {
      // WhatsApp的data-id格式通常为:
      // false_8618811980135@c.us_3EB01922C8C4EE6B1BA70A (个人聊天)
      // true_8618811980135-1234567890@g.us_3EB01922C8C4EE6B1BA70A (群聊)
      
      // 匹配个人聊天格式: (true|false)_数字@c.us_随机字符
      const personalChatRegex = /(?:true|false)_(\d+)@c\.us_/;
      const personalMatch = dataId.match(personalChatRegex);
      
      if (personalMatch && personalMatch[1]) {
        const phoneNumber = personalMatch[1];
        console.log(`📱 解析到个人聊天号码: ${phoneNumber}`);
        return phoneNumber;
      }
      
      // 匹配群聊格式: (true|false)_数字-数字@g.us_随机字符
      const groupChatRegex = /(?:true|false)_(\d+)-\d+@g\.us_/;
      const groupMatch = dataId.match(groupChatRegex);
      
      if (groupMatch && groupMatch[1]) {
        const phoneNumber = groupMatch[1];
        console.log(`📱 解析到群聊创建者号码: ${phoneNumber}`);
        return phoneNumber;
      }
      
      // 尝试更宽松的匹配，提取任何数字序列
      const looseRegex = /_(\d{8,15})[@_]/;
      const looseMatch = dataId.match(looseRegex);
      
      if (looseMatch && looseMatch[1]) {
        const phoneNumber = looseMatch[1];
        console.log(`📱 宽松匹配到号码: ${phoneNumber}`);
        return phoneNumber;
      }
      
      console.log(`❌ 无法从data-id解析号码: ${dataId}`);
      return null;
      
    } catch (error) {
      console.error('❌ 解析data-id时发生错误:', error);
      return null;
    }
  },

  // 格式化手机号码，添加国际区号
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }
    
    // 移除所有非数字字符
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    
    if (cleanNumber.length < 8) {
      console.log(`❌ 号码太短，无效: ${cleanNumber}`);
      return null;
    }
    
    // 如果号码已经包含国际区号，直接返回
    if (cleanNumber.length >= 10 && !cleanNumber.startsWith('0')) {
      const formattedNumber = '+' + cleanNumber;
      console.log(`📞 格式化号码: ${phoneNumber} -> ${formattedNumber}`);
      return formattedNumber;
    }
    
    // 对于中国号码，如果是11位且以1开头，添加86区号
    if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      const formattedNumber = '+86' + cleanNumber;
      console.log(`📞 格式化中国号码: ${phoneNumber} -> ${formattedNumber}`);
      return formattedNumber;
    }
    
    // 其他情况，假设已经是完整的国际号码
    const formattedNumber = '+' + cleanNumber;
    console.log(`📞 格式化号码: ${phoneNumber} -> ${formattedNumber}`);
    return formattedNumber;
  },
  
  // 搜索可能包含号码的相似元素
  searchForSimilarElements() {
    console.log('\n🔍 尝试搜索页面中可能包含号码的元素...');
    
    // 可能的选择器
    const possibleSelectors = [
      // 通用的号码相关选择器
      '[href^="tel:"]',
      '[href^="whatsapp://"]',
      'span:contains("+")',
      'div:contains("+")',
      // WhatsApp特定的可能选择器
      '[data-testid*="phone"]',
      '[data-testid*="number"]',
      '.copyable-text',
      '[title*="+"]'
    ];
    
    let foundElements = [];
    
    possibleSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`📋 找到 ${elements.length} 个匹配选择器 "${selector}" 的元素:`);
          elements.forEach((el, index) => {
            const text = (el.textContent || el.innerText || el.getAttribute('href') || '').trim();
            if (text && text.includes('+') && /\d/.test(text)) {
              console.log(`   ${index + 1}. ${text}`);
              foundElements.push({ selector, text, element: el });
            }
          });
        }
      } catch (e) {
        // 某些选择器可能不支持，忽略错误
      }
    });
    
    // 尝试查找包含数字和+号的所有文本
    console.log('\n🔍 搜索页面中所有包含+和数字的文本...');
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const text = node.textContent.trim();
          if (text.includes('+') && /\d{7,}/.test(text)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let textNode;
    let phoneTexts = [];
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent.trim();
      if (!phoneTexts.includes(text)) {
        phoneTexts.push(text);
        console.log(`📱 可能的号码文本: "${text}"`);
      }
    }
    
    if (foundElements.length === 0 && phoneTexts.length === 0) {
      console.log('❌ 未找到任何可能包含号码的元素');
    }
    
    return { foundElements, phoneTexts };
  },
  
  // 清理电话号码文本
  cleanPhoneNumber(text) {
    if (!text) return '';
    
    // 移除常见的非数字字符，但保留+号
    let cleaned = text.replace(/[^\d+]/g, '');
    
    // 如果没有+号，尝试从原文本中提取
    if (!cleaned.startsWith('+') && text.includes('+')) {
      const match = text.match(/\+[\d\s\-()]+/);
      if (match) {
        cleaned = match[0].replace(/[^\d+]/g, '');
      }
    }
    
    return cleaned;
  },

  // 批量测试共享区号功能
  testSharedCodes() {
    console.log('WeatherInfo: 开始测试共享区号功能...');
    
    // 测试用例
    const testCases = [
      // +1 区号测试
      { number: '14165551234', expected: 'CA', description: '+1 加拿大多伦多' },
      { number: '12125551234', expected: 'US', description: '+1 美国纽约 (需确认)' },
      { number: '12425551234', expected: 'BS', description: '+1 巴哈马 (需确认)' },
      
      // +7 区号测试  
      { number: '74951234567', expected: 'RU', description: '+7 俄罗斯莫斯科 (需确认)' },
      { number: '77011234567', expected: 'KZ', description: '+7 哈萨克斯坦阿拉木图' },
      { number: '76001234567', expected: 'KZ', description: '+7 哈萨克斯坦' },
      
      // +44 区号测试
      { number: '442012345678', expected: 'GB', description: '+44 英国伦敦 (需确认)' },
      { number: '441534123456', expected: 'JE', description: '+44 泽西岛' },
      { number: '441481123456', expected: 'GG', description: '+44 根西岛' },
      { number: '441624123456', expected: 'IM', description: '+44 马恩岛' },
      
      // 其他共享区号测试
      { number: '212123456789', expected: 'MA', description: '+212 摩洛哥 (需确认)' },
      { number: '262123456789', expected: 'RE', description: '+262 留尼汪 (需确认)' },
      { number: '590123456789', expected: 'GP', description: '+590 瓜德罗普 (需确认)' },
      { number: '599123456789', expected: 'CW', description: '+599 库拉索 (需确认)' }
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`\n--- 测试 ${index + 1}: ${testCase.description} ---`);
      const result = this.identifyCountry(testCase.number);
      
      if (result) {
        console.log(`识别结果: ${result.name} (${result.country})`);
        console.log(`是否需要确认: ${result.needsConfirmation ? '是' : '否'}`);
        console.log(`是否自动识别: ${result.isAutoDetected ? '是' : '否'}`);
        if (result.detectionMethod) {
          console.log(`识别方法: ${result.detectionMethod}`);
        }
        
        // 简单的验证
        const isCorrect = result.country === testCase.expected || 
                         (result.needsConfirmation && result.sharedCountryData?.countries.some(c => c.country === testCase.expected));
        console.log(`测试结果: ${isCorrect ? '✅ 通过' : '❌ 失败'}`);
      } else {
        console.log('❌ 无法识别号码');
      }
    });
    
    console.log('\n=== 共享区号测试完成 ===');
  },
  
  // 清除用户修正缓存 (开发/调试使用)
  clearUserCorrections() {
    this.userCorrections.clear();
    chrome.storage.local.remove(['weatherCountryCorrections']);
    console.log('WeatherInfo: 已清除所有用户修正记录');
  },



  // WhatsApp 标志注入提示功能
  createInjectionIndicator() {
    if (this.injectionIndicator) {
      return; // 已存在，避免重复创建
    }

    // 查找 WhatsApp 标志 SVG 元素 (多种方式尝试)
    let logoContainer = null;
    
    // 方法1: 通过 title 元素查找
    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.textContent === 'wa-wordmark-refreshed') {
      logoContainer = titleElement.closest('h1') || titleElement.closest('div');
    }
    
    // 方法2: 通过 SVG 属性查找
    if (!logoContainer) {
      const svgElement = document.querySelector('svg[viewBox="0 0 104 28"]');
      if (svgElement) {
        logoContainer = svgElement.closest('h1') || svgElement.closest('div');
      }
    }
    
    // 方法3: 通过 XPath 查找 (用户提供的路径)
    if (!logoContainer) {
      try {
        const xpathResult = document.evaluate(
          '//*[@id="app"]/div[1]/div[3]/div/div[3]/header/header/div/div/h1/span/svg',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (xpathResult.singleNodeValue) {
          logoContainer = xpathResult.singleNodeValue.closest('h1') || xpathResult.singleNodeValue.closest('div');
        }
      } catch (e) {
        console.log('WeatherInfo: XPath 查找失败:', e.message);
      }
    }
    if (!logoContainer) {
      console.log('WeatherInfo: 未找到合适的标志容器');
      return;
    }

    // 创建注入提示容器
    const indicator = document.createElement('div');
    indicator.className = 'wa-ai-injection-indicator';
    
    // 创建主标题
    const mainTitle = document.createElement('div');
    mainTitle.textContent = `AI全能助手 ${this.version} by Achord Tel: 13160235855`;
    mainTitle.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: #00a884;
      line-height: 1.2;
    `;
    
    // 创建小字提示
    const subTitle = document.createElement('div');
    subTitle.textContent = '尊重开源项目，如有二开请保留作者信息';
    subTitle.style.cssText = `
      font-size: 8px;
      font-weight: 400;
      color: #667781;
      margin-top: 2px;
      line-height: 1.2;
    `;
    
    // 组装容器
    indicator.appendChild(mainTitle);
    indicator.appendChild(subTitle);
    
    // 设置容器样式
    indicator.style.cssText = `
      margin-left: 12px;
      background: rgba(0, 168, 132, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      display: inline-block;
      vertical-align: middle;
      white-space: nowrap;
      opacity: 0.8;
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    // 添加悬停效果
    indicator.addEventListener('mouseenter', () => {
      indicator.style.opacity = '1';
      indicator.style.background = 'rgba(0, 168, 132, 0.15)';
    });
    
    indicator.addEventListener('mouseleave', () => {
      indicator.style.opacity = '0.8';
      indicator.style.background = 'rgba(0, 168, 132, 0.1)';
    });

    // 插入到标志容器中
    logoContainer.appendChild(indicator);
    this.injectionIndicator = indicator;

    console.log('WeatherInfo: ✅ AI助手注入提示已添加');
  },

  // 移除注入提示
  removeInjectionIndicator() {
    if (this.injectionIndicator) {
      this.injectionIndicator.remove();
      this.injectionIndicator = null;
      console.log('WeatherInfo: 注入提示已移除');
    }
  },

  // 初始化注入提示（带重试机制）
  initInjectionIndicator() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryCreateIndicator = () => {
      attempts++;
      this.createInjectionIndicator();
      
      if (!this.injectionIndicator && attempts < maxAttempts) {
        setTimeout(tryCreateIndicator, 1000); // 1秒后重试
      } else if (attempts >= maxAttempts) {
        console.log('WeatherInfo: 达到最大重试次数，停止尝试添加注入提示');
      }
    };
    
    // 立即尝试一次
    tryCreateIndicator();
    
    // 监听页面变化，如果注入提示被移除则重新创建
    const observer = new MutationObserver(() => {
      if (this.injectionIndicator && !document.contains(this.injectionIndicator)) {
        console.log('WeatherInfo: 检测到注入提示被移除，准备重新创建...');
        this.injectionIndicator = null;
        setTimeout(() => this.createInjectionIndicator(), 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  
  // 查看当前缓存状态 (开发/调试使用)
  viewCacheStatus() {
    console.log('WeatherInfo: 当前用户修正缓存:', Object.fromEntries(this.userCorrections));
    return {
      corrections: Object.fromEntries(this.userCorrections),
      totalCount: this.userCorrections.size
    };
  },
  
  // 清除用户修正缓存 (开发/调试使用)
  clearUserCorrections() {
    localStorage.removeItem(this.cacheKey);
    console.log('WeatherInfo: 用户修正缓存已清除');
  },
  
  // 手动触发天气信息功能
  manualTrigger: function() {
    console.log('🚀 手动触发天气信息功能...');
    
    // 重置状态
    this.currentStatus = 'idle';
    this.hideWeatherInfo();
    
    // 立即检查新聊天窗口
    this.checkForNewChatWindow();
    
    return true;
  },

  // 快速测试WhatsApp号码获取功能
  testWhatsAppExtraction() {
    console.log('=== WhatsApp号码提取测试 ===');
    console.log('🔍 正在搜索WhatsApp页面中的号码元素...\n');
    
    const result = this.tryGetWhatsAppNumber();
    
    if (result) {
      console.log(`\n✅ 成功获取到号码: ${result}`);
    } else {
      console.log('\n❌ 未能获取到有效的号码');
      console.log('💡 建议:');
      console.log('   1. 确保已在WhatsApp Web页面');
      console.log('   2. 尝试点击联系人头像进入详情页面');
      console.log('   3. 等待页面完全加载后再次尝试');
    }
    
    console.log('\n=== 测试完成 ===');
    return result;
  }
};

// 初始化功能
if (typeof window !== 'undefined') {
  // 确保在DOM加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.WeatherInfo.init(), 1000);
    });
  } else {
    setTimeout(() => window.WeatherInfo.init(), 1000);
  }
}

console.log('WeatherInfo: 天气信息模块已加载');

// 立即挂载到全局并提供测试函数
window.WeatherInfo = WeatherInfo;

// 确保全局对象可用
if (typeof window.WeatherInfo === 'undefined') {
  console.error('❌ WeatherInfo挂载失败！');
} else {
  console.log('✅ WeatherInfo已成功挂载到window对象');
}

// 提供全局快速测试函数
window.testWhatsApp = function() {
  console.log('=== WhatsApp号码提取测试 ===');
  console.log('🔍 正在搜索WhatsApp页面中的号码元素...\n');
  
  try {
    return WeatherInfo.testWhatsAppExtraction();
  } catch (error) {
    console.error('测试过程中出现错误:', error);
    console.log('💡 尝试直接调用核心功能...');
    return WeatherInfo.tryGetWhatsAppNumber();
  }
};

// 提供更直接的测试函数
window.getWhatsAppNumber = function() {
  return WeatherInfo.tryGetWhatsAppNumber();
};

// 提供全局手动触发函数
window.triggerWeatherInfo = function() {
  console.log('🚀 手动触发天气信息功能...');
  try {
    if (window.WeatherInfo && window.WeatherInfo.manualTrigger) {
      return window.WeatherInfo.manualTrigger();
    } else {
      return WeatherInfo.manualTrigger();
    }
  } catch (error) {
    console.error('❌ 手动触发失败:', error);
    return false;
  }
};

console.log('💡 可用的测试命令:');
console.log('  • testWhatsApp() - 完整测试流程');
console.log('  • getWhatsAppNumber() - 直接获取号码');
console.log('  • triggerWeatherInfo() - 手动触发天气信息功能');
console.log('  • window.WeatherInfo.testWhatsAppExtraction() - 原始方法');