import React from 'react';
import { RequestInfo } from './requestInfo';
import { Item, TabType } from './types';

interface GrievanceInfoProps {
  item: Item | null;
  activeTab: TabType;
  newComment: string;
  onCommentChange: (comment: string) => void;
  onAddComment: () => void;
  onBack: () => void;
  loading: boolean;
  loadingDetails: boolean;
  currentUserEmail: string | null;
  onCancelItem: () => void;
  token: string | null;
}

export const GrievanceInfo: React.FC<GrievanceInfoProps> = (props) => {
  return <RequestInfo {...props} />;
};