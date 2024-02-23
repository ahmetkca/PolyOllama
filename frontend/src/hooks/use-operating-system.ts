import { useEffect, useState } from 'react';

type OperatingSystem =
    | 'Windows'
    | 'macOS'
    | 'Linux'
    | 'Android'
    | 'iOS'
    | 'unknown';

function getOperatingSystem(windowNavigator: Navigator): OperatingSystem {
    const { platform, userAgent } = windowNavigator;
    const lowerCasePlatform = platform.toLowerCase();
    const lowerCaseUserAgent = userAgent.toLowerCase();

    if (lowerCasePlatform.startsWith('win')) return 'Windows';
    if (lowerCasePlatform.startsWith('mac')) return 'macOS';
    if (lowerCasePlatform.startsWith('linux')) return 'Linux';
    if (/android/.test(lowerCaseUserAgent)) return 'Android';
    if (/iphone|ipad|ipod/.test(lowerCaseUserAgent)) return 'iOS';

    return 'unknown';
}

export function useOperatingSystem(): OperatingSystem {
    const [os, setOs] = useState<OperatingSystem>('unknown');

    useEffect(() => {
        setOs(getOperatingSystem(navigator));
    }, []);

    return os;
}
