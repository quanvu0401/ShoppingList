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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { OPENAI_API_KEY, SERP_API_KEY } from '@env';

const MainScreen = () => {
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

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
            { id: Date.now().toString(), name: newItemName, url: imageUrl, completed: false },
            ...items
          ];
          setItems(updatedItems);
          saveItems(updatedItems);
          setNewItemName('');
          setModalVisible(false);
        } else {
          Alert.alert("Error", "Failed to fetch image URL.");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to add item.");
      }
    }
  };

  const getImageUrl = async (query) => {
    const searchUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`;
  
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

  const removeItem = (id) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const toggleCompletion = (name) => {
    const updatedItems = items.map(item => 
      item.name.toLowerCase() === name.toLowerCase() ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.url }} style={styles.itemImage} />
      <Text style={styles.itemText}>{item.name}</Text>
      <TouchableOpacity
        style={styles.checkMarkContainer}
        onPress={() => toggleCompletion(item.name)}
      >
        <View style={[
          styles.checkMarkCircle, 
          { backgroundColor: item.completed ? 'green' : 'white' }
        ]}>
          {item.completed && <Feather name="check" size={24} color="white" />}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
      >
        <Feather name="trash-2" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const handleCameraPress = async () => {
    if (!hasPermission) {
      Alert.alert('No access to camera');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });

    if (!result.canceled) {
      const prediction = await getObjectPrediction(result.assets[0].uri);
      if (prediction) {
        alert('Prediction completed:' + prediction)
        toggleCompletion(prediction.replace(/\./g,""));
      }
    }
  };

  const encodeImageToBase64 = async (imageUri) => {
    try {
      const base64String = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      return base64String;
    } catch (error) {
      console.error('Error encoding image to Base64:', error);
      return null;
    }
  };

  const getObjectPrediction = async (imageUri) => {
    const base64Image = await encodeImageToBase64(imageUri);
    if (!base64Image) {
      console.error('Image encoding failed');
      return 'Image encoding failed';
    }
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "What’s in this image? It is likely to be a grocery item. Give a one-word response."
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 10
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("Prediction:", result.choices[0].message.content);
      return result.choices[0].message.content.trim(); 

    } catch (error) {
      console.error("Error getting object prediction:", error);
      return "Prediction failed";
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

      <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
        <Feather name="camera" size={32} color="white" />
      </TouchableOpacity>

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
    paddingBottom: 100,
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
    justifyContent: 'space-between',
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
    flex: 1,
  },
  checkMarkContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  checkMarkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FF6347',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: [{ translateX: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#32CD32',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
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
