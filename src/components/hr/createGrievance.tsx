import React from 'react';
import { CreateRequest } from './createRequest';
import { TabType } from './types';

interface CreateGrievanceProps {
  activeTab: TabType;
  newItemForm: { nature: string; natureName: string; description: string };
  onFormChange: (form: { nature: string; natureName: string; description: string }) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  onOpenDropdown: () => void;
}

export const CreateGrievance: React.FC<CreateGrievanceProps> = (props) => {
  return <CreateRequest {...props} />;
};