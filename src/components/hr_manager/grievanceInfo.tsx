import React from 'react';
import { RequestInfo } from './requestInfo';
import { Item, TabType } from './types';

interface GrievanceInfoProps {
    item: Item | null;
    activeTab: TabType;
    newComment: string;
    onCommentChange: (comment: string) => void;
    onAddComment: () => void;
    onUpdateStatus: (status: string) => void;
    onBack: () => void;
    onEdit?: () => void;
    loading: boolean;
    loadingDetails: boolean;
    currentUserEmail: string | null;
    token: string | null;
}

export const GrievanceInfo: React.FC<GrievanceInfoProps> = (props) => {
    return <RequestInfo {...props} />;
};