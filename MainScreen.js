import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';


const MainScreen = () => {
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const savedItems = await AsyncStorage.getItem('items');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load items.' + error);
    }
  };

  const saveItems = async (itemsList) => {
    try {
      await AsyncStorage.setItem('items', JSON.stringify(itemsList));
    } catch (error) {
      Alert.alert('Error', 'Failed to save items.' + error);
    }
  };

  const addItem = async () => {
    if (newItemName.trim()) {
      try {
        const imageUrl = await getImageUrl(newItemName);
        if (imageUrl) {
          const updatedItems = [
            { id: Date.now().toString(), name: newItemName, url: imageUrl },
            ...items
          ];
          setItems(updatedItems);
          saveItems(updatedItems);
          setNewItemName('');
          setNewItemUrl('');
          setModalVisible(false);
        } else {
          Alert.alert("Error", "Failed to fetch image URL.");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to add item.");
      }
    }
  };

  const removeItem = (id) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.url }} style={styles.itemImage} />
      <Text style={styles.itemText}>{item.name}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
      >
        <Feather name="trash-2" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
  
  

  const getImageUrl = async (query) => {
    const apiKey = '88d5cef2a88af45654dd0e676fc2d2fb83a954b8fee8fdfbbd9390fa9376e40f';
    const searchUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${apiKey}`;
  
    try {
      const response = await fetch(searchUrl);
      const result = await response.json();
  
      if (result.images_results && result.images_results.length > 0) {
        return result.images_results[0].original; 
      } else {
        throw new Error("No image results found");
      }
    } catch (error) {
      console.error("Error fetching image URL:", error);
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grocery List</Text>
      
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
                color="#FF6347"
              />
              <Button title="Add" onPress={addItem} color="#32CD32" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dcdcdc',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    margin: 20,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#32CD32',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 20,
    justifyContent: 'space-between', // Align items and remove button
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 15,
  },
  itemText: {
    fontSize: 18,
    fontWeight: '500',
    flex: 1, // Takes up the remaining space
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center', // Center the icon within the button
    borderRadius: 20,
    backgroundColor: '#FF6347',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '80%',
    padding: 20,
    borderRadius: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default MainScreen;
