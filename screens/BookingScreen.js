import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';

const services = [
  { id: 1, name: 'Personal Care', price: '$25/hr' },
  { id: 2, name: 'Companionship', price: '$20/hr' },
  { id: 3, name: 'Meal Preparation', price: '$22/hr' },
  { id: 4, name: 'Light Housekeeping', price: '$20/hr' },
  { id: 5, name: 'Transportation', price: '$25/hr' },
  { id: 6, name: 'Medication Reminders', price: '$20/hr' },
];

export default function BookingScreen() {
  const [selected, setSelected] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Book a Service</Text>
      <Text style={styles.subheader}>Select a service to book</Text>
      {services.map(service => (
        <TouchableOpacity
          key={service.id}
          style={[styles.card, selected?.id === service.id && styles.selectedCard]}
          onPress={() => setSelected(service)}
        >
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.servicePrice}>{service.price}</Text>
        </TouchableOpacity>
      ))}
      {selected && (
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book {selected.name}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  subheader: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  selectedCard: { borderColor: '#2563eb' },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  servicePrice: { fontSize: 16, color: '#2563eb', marginTop: 4 },
  bookButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  bookButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});