import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  TextInput,
  FlatList,
  StatusBar,
} from 'react-native';
import {db, auth} from './firebase';
import {collection, getDocs} from 'firebase/firestore';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');
const COLUMN_WIDTH = 90;
const NAME_COLUMN_WIDTH = 200;
const CARD_WIDTH = 70;
const TOTAL_COLUMN_WIDTH = 80;

const statusColors = {
  P: '#22C55E',
  '-': '#E5E7EB',
  A: '#EF4444',
  L: '#F59E0B',
};

const CardDataOverviewScreen = () => {
  const navigation = useNavigation();
  const [cardData, setCardData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dateData, setDateData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowHeights, setRowHeights] = useState({});

  const fetchData = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return navigation.goBack();

    const userId = user.uid;

    // Fetch Card Students
    const cardSnap = await getDocs(collection(db, 'users', userId, 'Card_students'));
    let cards = cardSnap.docs.map((doc) => ({
      cardNumber: doc.id,
      name: doc.data().name || 'Unknown',
    }));

    // ✅ Sort by numeric card number
    cards = cards.sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));

    setCardData(cards);
    setFilteredData(cards);

    // Fetch Attendance (S_Book)
    const bookSnap = await getDocs(collection(db, 'users', userId, 'S_Book'));
    const dates = bookSnap.docs.map((doc) => {
      const date = doc.id;
      const attendance = doc.data().attendance || {};

      // Generate entries using sorted cards
      const entries = cards.map((card) => {
        const rawStatus = attendance[card.cardNumber]?.toString();
        const displayData = rawStatus === '1' ? 'P' : '-';
        return {
          cardNumber: card.cardNumber,
          data: displayData,
        };
      });

      return { date, entries };
    });

    setDateData(dates);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};



  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const onNameTextLayout = (event, cardNumber) => {
    const {height: textHeight} = event.nativeEvent.layout;
    const calculatedHeight = Math.max(50, textHeight + 20);
    setRowHeights(prev => ({
      ...prev,
      [cardNumber]: calculatedHeight,
    }));
  };

  useFocusEffect(
  React.useCallback(() => {
    //setLoading(true); // force reloading indicator
    fetchData();
  }, [])
);



  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(cardData);
    } else {
      const filtered = cardData.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, cardData]);

  const calculatePresentCount = student => {
    return dateData.reduce((count, date) => {
      const entry = date.entries.find(e => e.cardNumber === student.cardNumber);
      return count + (entry?.data === 'P' ? 1 : 0);
    }, 0);
  };

  const renderStudentRow = ({item: student}) => {
    const presentCount = calculatePresentCount(student);
    const rowHeight = rowHeights[student.cardNumber] || 50;

    return (
      <View style={[styles.dataRow, {height: rowHeight}]}>

        <View style={[styles.nameCell, {width: NAME_COLUMN_WIDTH}]}>
          <Text
            style={styles.nameText}
            numberOfLines={2}
            ellipsizeMode="tail"
            onLayout={e => onNameTextLayout(e, student.cardNumber)}>
            {student.name}
          </Text>
        </View>
        {dateData.map(date => {
          const entry = date.entries.find(
            e => e.cardNumber === student.cardNumber,
          );
          const status = entry?.data || '-';
          return (
            <View
              key={`${date.date}-${student.cardNumber}`}
              style={[
                styles.statusCell,
                {width: COLUMN_WIDTH, height: rowHeight},
              ]}>
              <View
                style={[
                  styles.statusIndicator,
                  {backgroundColor: statusColors[status]},
                ]}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </View>
          );
        })}
        <View
          style={[
            styles.totalCell,
            {
              width: TOTAL_COLUMN_WIDTH,
              borderRightWidth: 1,
              borderColor: '#E5E7EB',
              height: rowHeight,
            },
          ]}>
          <Text style={styles.totalText}>{presentCount}</Text>
        </View>
      </View>
    );
  };

  const renderFixedColumnItem = ({item}) => (
    <View
      key={item.cardNumber}
      style={[
        styles.numberCell,
        {
          height: rowHeights[item.cardNumber] || 50,
          borderBottomWidth: 1,
          borderColor: '#E5E7EB',
        },
      ]}>
      <Text style={styles.numberText}>{item.cardNumber}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Attendance Data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <FlatList
        data={[1]} // Single item to render the entire content
        renderItem={() => (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Attendance Overview</Text>
              <View style={styles.headerRight} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon
                name="search"
                size={20}
                color="#6B7280"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{filteredData.length}</Text>
                <Text style={styles.summaryLabel}>Students</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{dateData.length}</Text>
                <Text style={styles.summaryLabel}>Days</Text>
              </View>
            </View>

            {/* Attendance Table */}
            <View style={styles.tableContainer}>
              {/* Fixed Column (Numbers) */}
              <View style={styles.fixedColumn}>
                <View style={[styles.headerCell]}>
                  <Text style={styles.headerText}>ID</Text>
                </View>
                <FlatList
                  data={filteredData}
                  renderItem={renderFixedColumnItem}
                  keyExtractor={item => item.cardNumber}
                  scrollEnabled={false}
                />
              </View>

              {/* Scrollable Content */}
              <FlatList
                horizontal
                data={[1]} // Single item to render the scrollable content
                renderItem={() => (
                  <View>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                      <View
                        style={[styles.headerCell, {width: NAME_COLUMN_WIDTH}]}>
                        <Text style={styles.headerText}>Student Name</Text>
                      </View>
                      {dateData.map(date => (
                        <View
                          key={date.date}
                          style={[styles.headerCell, {width: COLUMN_WIDTH}]}>
                          <Text style={styles.dateText}>
                            {date.date
                              .split('-')
                              .reverse()
                              .slice(0, 2)
                              .join('/')}
                          </Text>
                        </View>
                      ))}
                      <View
                        style={[
                          styles.headerCell,
                          {
                            width: TOTAL_COLUMN_WIDTH,
                            borderRightWidth: 1,
                            borderColor: '#E5E7EB',
                          },
                        ]}>
                        <Text style={styles.headerText}>Total</Text>
                      </View>
                    </View>

                    {/* Data Rows */}
                    <FlatList
                      data={filteredData}
                      renderItem={renderStudentRow}
                      keyExtractor={item => item.cardNumber}
                      scrollEnabled={false}
                    />
                  </View>
                )}
                showsHorizontalScrollIndicator={false}
                overScrollMode="never"
                bounces={false}
              />
            </View>
          </>
        )}
        keyExtractor={() => 'main-content'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
          />
        }
        overScrollMode="never"
        bounces={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    //paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: -24,
    marginTop:15,
  },
  backButton: {
    padding: 8,
    zIndex: 1,
    marginTop:15,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  tableContainer: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 16,
    minHeight: height * 0.6,
    marginHorizontal: 10,
  },
  scrollableContainer: {
    flex: 1,
  },
  fixedColumn: {
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    height: 40,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  numberCell: {
    width: CARD_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  numberText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  nameCell: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  nameText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 20, // Better for multi-line text
  },
  statusCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  totalCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  totalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
});

export default CardDataOverviewScreen;
