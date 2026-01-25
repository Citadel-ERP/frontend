// hr_employee_management/editLeaves.tsx
import React from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';

interface EditLeavesProps {
  employee: any;
  employeeDetails: any;
  onBack: () => void;
  token: string;
}

const EditLeaves: React.FC<EditLeavesProps> = ({ 
  employee, 
  employeeDetails, 
  onBack, 
  token 
}) => {
  const earnedLeaves = employeeDetails?.earned_leaves || 0;
  const sickLeaves = employeeDetails?.sick_leaves || 0;
  const casualLeaves = employeeDetails?.casual_leaves || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
      
      {/* Header */}
      <View style={[styles.headerBanner, { height: 120 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <View style={styles.backIcon}>
                <View style={styles.backArrow} />
                <Text style={styles.backText}>Back</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.centerSection}>
              <Text style={styles.logoText}>EDIT LEAVES</Text>
            </View>
            
            <View style={styles.rightSection} />
          </View>
        </View>
        
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>{employee.full_name}</Text>
          <Text style={styles.sectionSubtitle}>
            Employee ID: {employee.employee_id}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView}>
        <View style={{ padding: 16 }}>
          {/* Earned Leaves */}
          <View style={[styles.infoCard, { marginBottom: 16 }]}>
            <Text style={styles.infoCardTitle}>Earned Leaves</Text>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.infoValue}>{earnedLeaves}</Text>
            </View>
          </View>

          {/* Sick Leaves */}
          <View style={[styles.infoCard, { marginBottom: 16 }]}>
            <Text style={styles.infoCardTitle}>Sick Leaves</Text>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.infoValue}>{sickLeaves}</Text>
            </View>
          </View>

          {/* Casual Leaves */}
          <View style={[styles.infoCard, { marginBottom: 16 }]}>
            <Text style={styles.infoCardTitle}>Casual Leaves</Text>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.infoValue}>{casualLeaves}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EditLeaves;