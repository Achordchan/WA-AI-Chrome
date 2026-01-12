/*
用途：天气模块国家识别/号码解析 Service（MVP）。
说明：
- 将 legacy-weather-info.js 中 identifyCountry / handleSharedCountryCode 等“号码 -> 国家信息”的核心逻辑下沉到 service，减少 legacy 体积。
- 该 service 以“操作 owner（通常是 window.WeatherInfo 对象）”的方式工作，保持回滚安全与兼容性。
作者：Achord
*/

(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.weatherCountryDetectService) return;

  // 识别国家
  function identifyCountry(owner, phoneNumber) {
    // 首先检查用户是否已手动修正过此号码
    if (owner.userCorrections && owner.userCorrections.has(phoneNumber)) {
      const correction = owner.userCorrections.get(phoneNumber);
      try {
        console.log('WeatherInfo: 使用用户修正的国家信息:', correction);
      } catch (e) {
        // ignore
      }
      return {
        ...correction,
        phoneNumber: phoneNumber,
        isUserCorrected: true
      };
    }

    // 其次使用已保存的自动推断结果
    if (owner.resolvedCountries && owner.resolvedCountries.has(phoneNumber)) {
      const cached = owner.resolvedCountries.get(phoneNumber);
      if (cached && cached.country && cached.timezone) {
        const info = {
          ...cached,
          phoneNumber: phoneNumber,
          isAutoResolved: true
        };

        // 共享区号：缓存里可能没有 sharedCountryData，需要恢复，否则会丢失“选择国家”入口
        try {
          if (
            info.needsConfirmation === true &&
            !info.sharedCountryData &&
            info.prefix &&
            owner.countryCodeMap &&
            owner.countryCodeMap[info.prefix] &&
            owner.countryCodeMap[info.prefix].isShared
          ) {
            info.sharedCountryData = owner.countryCodeMap[info.prefix];
          }
        } catch (e) {
          // ignore
        }

        return info;
      }
    }

    // 尝试匹配不同长度的区号
    for (let i = 1; i <= 4; i++) {
      const prefix = phoneNumber.substring(0, i);
      if (owner.countryCodeMap && owner.countryCodeMap[prefix]) {
        const countryData = owner.countryCodeMap[prefix];

        // 如果是共享区号，尝试智能识别
        if (countryData.isShared) {
          return handleSharedCountryCode(owner, phoneNumber, prefix, countryData);
        }

        return {
          ...countryData,
          prefix: prefix,
          phoneNumber: phoneNumber
        };
      }
    }

    return null;
  }

  // 处理共享区号的智能识别
  function handleSharedCountryCode(owner, phoneNumber, prefix, countryData) {
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
        const canadaInfo = countryData.countries.find((c) => c.country === 'CA');
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
        if (
          (firstDigit === '7' && ['0', '1', '2', '3', '4', '5', '6', '7', '8'].includes(secondDigit)) ||
          (firstDigit === '6' && ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(secondDigit))
        ) {
          const kazakhstanInfo = countryData.countries.find((c) => c.country === 'KZ');
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
        const jerseyInfo = countryData.countries.find((c) => c.country === 'JE');
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
        const guernseyInfo = countryData.countries.find((c) => c.country === 'GG');
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
        const isleOfManInfo = countryData.countries.find((c) => c.country === 'IM');
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
  }

  window.WAAP.services.weatherCountryDetectService = {
    identifyCountry,
    handleSharedCountryCode
  };
})();
