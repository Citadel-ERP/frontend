import React from 'react';
import { Requests } from './requests';
import { Item, TabType } from './types';

interface GrievanceProps {
  items: Item[];
  loading: boolean;
  onItemPress: (item: Item) => void;
  onCancelItem: (item: Item) => void;
  onCreateNew: () => void;
  activeTab: TabType;
}

export const Grievance: React.FC<GrievanceProps> = (props) => {
  return <Requests {...props} />;
};