import React from 'react';
import { Requests } from './requests';
import { Item, TabType } from './types';

interface GrievancesProps {
  items: Item[];
  loading: boolean;
  onItemPress: (item: Item) => void;
  onUpdateStatus: (item: Item, status: string) => void;
  activeTab: TabType;
  filterStatus: string | null;
  onFilterChange: (status: string | null) => void;
}

export const Grievances: React.FC<GrievancesProps> = (props) => {
  return <Requests {...props} />;
};