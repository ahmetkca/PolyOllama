import { fetcher } from '@/lib/utils';
import useSWR from 'swr'

type Model = {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        format: string;
        family: string;
        families: string[] | null;
        parameter_size: string;
        quantization_level: string;
    }
}

type UseModels = {
    models: Model[];
    isLoading: boolean;
    isError: any;
}

export const useModels = (endpoint?: string) => {
    const {
        data,
        error,
        isLoading,
    } = useSWR<UseModels>(`http://localhost:3000/models${endpoint ? `?endpoint=${endpoint}` : ''}`, fetcher);

    return {
        models: data,
        isLoading,
        isError: error,
    }
}