import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const services = [
  { id: 1, name: 'Personal Care', description: 'Bathing, grooming, and hygiene assistance', price: '$25/hr' },
  { id: 2, name: 'Companionship', description: 'Social interaction and emotional support', price: '$20/hr' },
  { id: 3, name: 'Meal Preparation', description: 'Healthy meal planning and cooking', price: '$22/hr' },
  { id: 4, name: 'Light Housekeeping', description: 'Cleaning, laundry, and home organization', price: '$20/hr' },
  { id: 5, name: 'Transportation', description: 'Rides to appointments and errands', price: '$25/hr' },
  { id: 6, name: 'Medication Reminders', description: 'Timely medication management', price: '$20/hr' },
];

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Available Services</Text>
      {services.map(service => (
        <TouchableOpacity key={service.id} style={styles.card}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceDesc}>{service.description}</Text>
          <Text style={styles.servicePrice}>{service.price}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  serviceDesc: { fontSize: 14, color: '#64748b', marginTop: 4 },
  servicePrice: { fontSize: 16, fontWeight: 'bold', color: '#2563eb', marginTop: 8 },
});