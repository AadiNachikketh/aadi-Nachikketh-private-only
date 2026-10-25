export interface IndiaStateSeed {
  code: string;
  name: string;
  type: 'State' | 'Union Territory';
  lat: string;
  lng: string;
  districts: Array<{
    name: string;
    cities: Array<{
      name: string;
      places: string[];
    }>;
  }>;
}

export const INDIA_STATES_AND_PLACES: IndiaStateSeed[] = [
  {
    code: 'KA',
    name: 'Karnataka',
    type: 'State',
    lat: '15.3173',
    lng: '75.7139',
    districts: [
      {
        name: 'Bengaluru Urban',
        cities: [
          {
            name: 'Bengaluru',
            places: [
              'Whitefield',
              'Indiranagar',
              'Koramangala',
              'JP Nagar',
              'Jayanagar',
              'HSR Layout',
              'Marathahalli',
              'MG Road',
              'Malleshwaram',
              'Electronic City',
              'Sadashivanagar',
              'Rajajinagar',
              'Banashankari',
              'Hebbal',
              'Yelahanka',
              'Bellandur',
              'Sarjapur Road',
              'Basavanagudi',
              'Frazer Town',
              'Commercial Street',
            ],
          },
        ],
      },
      {
        name: 'Mysuru District',
        cities: [
          {
            name: 'Mysuru',
            places: ['Saraswathipuram', 'VV Mohalla', 'Devaraja Market', 'Jayalakshmipuram', 'Kuvempunagar', 'Hebbal Mysuru'],
          },
        ],
      },
      {
        name: 'Dakshina Kannada',
        cities: [
          {
            name: 'Mangaluru',
            places: ['Hampankatta', 'Kadri', 'Bejai', 'Kankanady', 'Surathkal', 'Falnir'],
          },
        ],
      },
      {
        name: 'Dharwad District',
        cities: [
          {
            name: 'Hubballi-Dharwad',
            places: ['Vidyanagar', 'Gokul Road', 'Keshwapur', 'Deshpande Nagar', 'Saptapur'],
          },
        ],
      },
      {
        name: 'Belagavi District',
        cities: [
          {
            name: 'Belagavi',
            places: ['Tilakwadi', 'Camp Area', 'Shahapur', 'Nehru Nagar', 'Ramdev Galli'],
          },
        ],
      },
      {
        name: 'Udupi District',
        cities: [
          {
            name: 'Udupi',
            places: ['Manipal', 'Car Street', 'Kadiyali', 'Kundapura', 'Karkala'],
          },
        ],
      },
      {
        name: 'Shivamogga District',
        cities: [
          {
            name: 'Shivamogga',
            places: ['Vinoba Nagar', 'Gopala', 'Durgigudi', 'Kuvempu Road'],
          },
        ],
      },
      {
        name: 'Tumakuru District',
        cities: [
          {
            name: 'Tumakuru',
            places: ['Sira Gate', 'SS Puram', 'BH Road', 'Kyathsandra'],
          },
        ],
      },
    ],
  },
  {
    code: 'MH',
    name: 'Maharashtra',
    type: 'State',
    lat: '19.7515',
    lng: '75.7139',
    districts: [
      {
        name: 'Mumbai Suburban',
        cities: [
          {
            name: 'Mumbai',
            places: [
              'Bandra West',
              'Andheri West',
              'Juhu',
              'Powai',
              'Goregaon East',
              'Malad West',
              'Borivali West',
              'Santacruz West',
              'Khar West',
              'Ghatkopar East',
              'Mulund West',
              'Chembur',
              'Vile Parle',
            ],
          },
        ],
      },
      {
        name: 'Mumbai City',
        cities: [
          {
            name: 'South Mumbai',
            places: ['Colaba', 'Nariman Point', 'Fort', 'Lower Parel', 'Worli', 'Dadar West', 'Malabar Hill', 'Zaveri Bazaar', 'BKC'],
          },
        ],
      },
      {
        name: 'Pune District',
        cities: [
          {
            name: 'Pune',
            places: [
              'Koregaon Park',
              'Kalyani Nagar',
              'Viman Nagar',
              'Baner',
              'Kothrud',
              'Aundh',
              'Hinjewadi',
              'Wakad',
              'Shivajinagar',
              'Camp MG Road',
              'Deccan Gymkhana',
              'Hadapsar',
            ],
          },
          {
            name: 'Pimpri-Chinchwad',
            places: ['Pimpri', 'Chinchwad', 'Akurdi', 'Nigdi', 'Pimple Saudagar'],
          },
        ],
      },
      {
        name: 'Nagpur District',
        cities: [
          {
            name: 'Nagpur',
            places: ['Dharampeth', 'Sadar', 'Sitabuldi', 'Ramdaspeth', 'Civil Lines', 'Wardha Road'],
          },
        ],
      },
      {
        name: 'Thane District',
        cities: [
          {
            name: 'Thane',
            places: ['Ghodbunder Road', 'Hiranandani Estate', 'Naupada', 'Majiwada'],
          },
          {
            name: 'Navi Mumbai',
            places: ['Vashi', 'Nerul', 'Belapur CBD', 'Kharghar', 'Panvel', 'Airoli'],
          },
        ],
      },
      {
        name: 'Nashik District',
        cities: [
          {
            name: 'Nashik',
            places: ['College Road', 'Gangapur Road', 'Indira Nagar', 'MG Road Nashik', 'Panchavati'],
          },
        ],
      },
      {
        name: 'Chhatrapati Sambhajinagar District',
        cities: [
          {
            name: 'Chhatrapati Sambhajinagar',
            places: ['CIDCO', 'Nirala Bazar', 'Jalna Road', 'Usmanpura'],
          },
        ],
      },
    ],
  },
  {
    code: 'DL',
    name: 'Delhi (NCT)',
    type: 'Union Territory',
    lat: '28.6139',
    lng: '77.2090',
    districts: [
      {
        name: 'New Delhi District',
        cities: [
          {
            name: 'New Delhi',
            places: ['Connaught Place', 'Khan Market', 'Chanakyapuri', 'Barakhamba Road', 'Janpath'],
          },
        ],
      },
      {
        name: 'South Delhi',
        cities: [
          {
            name: 'South Delhi',
            places: [
              'Hauz Khas',
              'Greater Kailash I & II',
              'Saket',
              'Defence Colony',
              'Lajpat Nagar',
              'South Extension',
              'Vasant Kunj',
              'Green Park',
              'Nehru Place',
            ],
          },
        ],
      },
      {
        name: 'West Delhi',
        cities: [
          {
            name: 'West Delhi',
            places: ['Rajouri Garden', 'Punjabi Bagh', 'Janakpuri', 'Patel Nagar', 'Paschim Vihar'],
          },
        ],
      },
      {
        name: 'Central & North Delhi',
        cities: [
          {
            name: 'Central Delhi',
            places: ['Karol Bagh', 'Chandni Chowk', 'Daryaganj', 'Paharganj', 'Civil Lines Delhi', 'Model Town', 'Pitampura', 'Rohini'],
          },
        ],
      },
      {
        name: 'South West & East Delhi',
        cities: [
          {
            name: 'Dwarka & East Delhi',
            places: ['Dwarka Sector 12', 'Aerocity', 'Preet Vihar', 'Mayur Vihar', 'Laxmi Nagar'],
          },
        ],
      },
    ],
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    type: 'State',
    lat: '11.1271',
    lng: '78.6569',
    districts: [
      {
        name: 'Chennai District',
        cities: [
          {
            name: 'Chennai',
            places: [
              'T. Nagar',
              'Anna Nagar',
              'Adyar',
              'Velachery',
              'Nungambakkam',
              'Mylapore',
              'Alwarpet',
              'Besant Nagar',
              'OMR Sholinganallur',
              'Guindy',
              'Egmore',
              'Sowcarpet',
            ],
          },
        ],
      },
      {
        name: 'Coimbatore District',
        cities: [
          {
            name: 'Coimbatore',
            places: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Saibaba Colony', 'Avinashi Road', 'Race Course'],
          },
        ],
      },
      {
        name: 'Madurai District',
        cities: [
          {
            name: 'Madurai',
            places: ['Anna Nagar Madurai', 'KK Nagar', 'South Masi Street', 'Bypass Road', 'SS Colony'],
          },
        ],
      },
      {
        name: 'Tiruchirappalli District',
        cities: [
          {
            name: 'Tiruchirappalli',
            places: ['Thillai Nagar', 'Cantonment', 'Srirangam', 'KK Nagar Trichy'],
          },
        ],
      },
      {
        name: 'Salem District',
        cities: [
          {
            name: 'Salem',
            places: ['Fairlands', 'Alagapuram', 'Five Roads', 'Shevapet'],
          },
        ],
      },
      {
        name: 'Tiruppur District',
        cities: [
          {
            name: 'Tiruppur',
            places: ['Avinashi Road Tiruppur', 'Kumaran Road', 'PN Road'],
          },
        ],
      },
    ],
  },
  {
    code: 'TG',
    name: 'Telangana',
    type: 'State',
    lat: '18.1124',
    lng: '79.0193',
    districts: [
      {
        name: 'Hyderabad District',
        cities: [
          {
            name: 'Hyderabad',
            places: [
              'Banjara Hills',
              'Jubilee Hills',
              'Somajiguda',
              'Begumpet',
              'Abids',
              'Himayatnagar',
              'Ameerpet',
              'Secunderabad',
              'Charminar',
            ],
          },
        ],
      },
      {
        name: 'Rangareddy District',
        cities: [
          {
            name: 'Cyberabad',
            places: ['HITEC City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Financial District', 'Manikonda', 'Kokapet'],
          },
        ],
      },
      {
        name: 'Medchal-Malkajgiri',
        cities: [
          {
            name: 'Kukatpally & Kompally',
            places: ['Kukatpally', 'KPHB Colony', 'Kompally', 'Miyapur', 'AS Rao Nagar'],
          },
        ],
      },
      {
        name: 'Warangal District',
        cities: [
          {
            name: 'Warangal',
            places: ['Hanamkonda', 'Kazipet', 'Subedari', 'Chowrastha'],
          },
        ],
      },
    ],
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    type: 'State',
    lat: '22.2587',
    lng: '71.1924',
    districts: [
      {
        name: 'Ahmedabad District',
        cities: [
          {
            name: 'Ahmedabad',
            places: ['CG Road', 'Satellite', 'SG Highway', 'Bodakdev', 'Prahlad Nagar', 'Vastrapur', 'Navrangpura', 'Maninagar', 'Sindhu Bhavan Road'],
          },
        ],
      },
      {
        name: 'Surat District',
        cities: [
          {
            name: 'Surat',
            places: ['Vesu', 'Adajan', 'Piplod', 'City Light', 'Varachha', 'Ring Road Surat', 'Ghod Dod Road'],
          },
        ],
      },
      {
        name: 'Vadodara District',
        cities: [
          {
            name: 'Vadodara',
            places: ['Alkapuri', 'Race Course Road', 'Gotri', 'Manjalpur', 'Fatehgunj', 'Sayajigunj'],
          },
        ],
      },
      {
        name: 'Rajkot District',
        cities: [
          {
            name: 'Rajkot',
            places: ['Kalawad Road', 'Yagnik Road', '150 Feet Ring Road', 'Soni Bazar'],
          },
        ],
      },
      {
        name: 'Gandhinagar District',
        cities: [
          {
            name: 'Gandhinagar',
            places: ['GIFT City', 'Infocity', 'Sector 11', 'Kudasan'],
          },
        ],
      },
    ],
  },
  {
    code: 'KL',
    name: 'Kerala',
    type: 'State',
    lat: '10.8505',
    lng: '76.2711',
    districts: [
      {
        name: 'Ernakulam District',
        cities: [
          {
            name: 'Kochi',
            places: ['MG Road Kochi', 'Edappally', 'Panampilly Nagar', 'Kakkanad', 'Marine Drive', 'Fort Kochi', 'Vyttila', 'Kaloor'],
          },
        ],
      },
      {
        name: 'Thiruvananthapuram District',
        cities: [
          {
            name: 'Thiruvananthapuram',
            places: ['Kowdiar', 'Kazhakkoottam Technopark', 'Vazhuthacaud', 'Pattom', 'East Fort', 'Statue'],
          },
        ],
      },
      {
        name: 'Kozhikode District',
        cities: [
          {
            name: 'Kozhikode',
            places: ['Mavoor Road', 'SM Street', 'Nadakkavu', 'Thondayad'],
          },
        ],
      },
      {
        name: 'Thrissur District',
        cities: [
          {
            name: 'Thrissur',
            places: ['Swaraj Round', 'High Road (Jewellery Street)', 'Punkunnam', 'East Fort Thrissur'],
          },
        ],
      },
      {
        name: 'Kottayam District',
        cities: [
          {
            name: 'Kottayam',
            places: ['KK Road', 'Kanjikuzhy', 'Baker Junction'],
          },
        ],
      },
    ],
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    type: 'State',
    lat: '27.0238',
    lng: '74.2179',
    districts: [
      {
        name: 'Jaipur District',
        cities: [
          {
            name: 'Jaipur',
            places: ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'MI Road', 'Johari Bazar', 'Mansarovar', 'Raja Park', 'Tonk Road'],
          },
        ],
      },
      {
        name: 'Udaipur District',
        cities: [
          {
            name: 'Udaipur',
            places: ['Panchwati', 'Fatehpura', 'Hiran Magri', 'Bapu Bazar', 'Shobhagpura'],
          },
        ],
      },
      {
        name: 'Jodhpur District',
        cities: [
          {
            name: 'Jodhpur',
            places: ['Sardarpura', 'Ratanada', 'Shastri Nagar', 'Paota'],
          },
        ],
      },
      {
        name: 'Kota District',
        cities: [
          {
            name: 'Kota',
            places: ['Talwandi', 'Gumanpura', 'Vigyan Nagar', 'Rajeev Gandhi Nagar'],
          },
        ],
      },
    ],
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    type: 'State',
    lat: '26.8467',
    lng: '80.9462',
    districts: [
      {
        name: 'Gautam Buddha Nagar',
        cities: [
          {
            name: 'Noida & Greater Noida',
            places: ['Sector 18 Noida', 'Sector 62 Noida', 'Sector 150', 'Noida Expressway', 'Knowledge Park'],
          },
        ],
      },
      {
        name: 'Lucknow District',
        cities: [
          {
            name: 'Lucknow',
            places: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar Lucknow', 'Aminabad', 'Mahanagar'],
          },
        ],
      },
      {
        name: 'Ghaziabad District',
        cities: [
          {
            name: 'Ghaziabad',
            places: ['Indirapuram', 'Vaishali', 'Raj Nagar District Centre', 'Kaushambi'],
          },
        ],
      },
      {
        name: 'Kanpur Nagar',
        cities: [
          {
            name: 'Kanpur',
            places: ['Swaroop Nagar', 'Civil Lines Kanpur', 'Birhana Road', 'Kakadeo'],
          },
        ],
      },
      {
        name: 'Varanasi District',
        cities: [
          {
            name: 'Varanasi',
            places: ['Sigra', 'Lanka', 'Godowlia', 'Cantonment Varanasi'],
          },
        ],
      },
      {
        name: 'Agra District',
        cities: [
          {
            name: 'Agra',
            places: ['Sanjay Place', 'Sadar Bazar Agra', 'Fatehabad Road', 'Kamla Nagar'],
          },
        ],
      },
    ],
  },
  {
    code: 'WB',
    name: 'West Bengal',
    type: 'State',
    lat: '22.9868',
    lng: '87.8550',
    districts: [
      {
        name: 'Kolkata District',
        cities: [
          {
            name: 'Kolkata',
            places: ['Park Street', 'Ballygunge', 'Alipore', 'Camac Street', 'Gariahat', 'New Market', 'Bhowanipore', 'Bowbazar (Jewellery Hub)'],
          },
        ],
      },
      {
        name: 'North 24 Parganas',
        cities: [
          {
            name: 'Salt Lake & New Town',
            places: ['Salt Lake Sector V', 'Salt Lake Sector I', 'New Town Rajarhat', 'Lake Town'],
          },
        ],
      },
      {
        name: 'Darjeeling District',
        cities: [
          {
            name: 'Siliguri & Darjeeling',
            places: ['Sevoke Road', 'Hill Cart Road', 'Pradhan Nagar', 'Mall Road Darjeeling'],
          },
        ],
      },
    ],
  },
  {
    code: 'HR',
    name: 'Haryana',
    type: 'State',
    lat: '29.0588',
    lng: '76.0856',
    districts: [
      {
        name: 'Gurugram District',
        cities: [
          {
            name: 'Gurugram',
            places: ['DLF Cyber City', 'Golf Course Road', 'MG Road Gurugram', 'Sohna Road', 'Sector 29', 'Galleria Market', 'Udyog Vihar'],
          },
        ],
      },
      {
        name: 'Faridabad District',
        cities: [
          {
            name: 'Faridabad',
            places: ['Sector 15 Faridabad', 'NIT Faridabad', 'Crown Interiorz Hub'],
          },
        ],
      },
      {
        name: 'Panchkula & Karnal',
        cities: [
          {
            name: 'Panchkula',
            places: ['Sector 7 Panchkula', 'Sector 20 Panchkula', 'Model Town Karnal'],
          },
        ],
      },
    ],
  },
  {
    code: 'PB',
    name: 'Punjab',
    type: 'State',
    lat: '31.1471',
    lng: '75.3412',
    districts: [
      {
        name: 'Ludhiana District',
        cities: [
          {
            name: 'Ludhiana',
            places: ['Sarabha Nagar', 'Model Town Ludhiana', 'Ferozepur Road', 'Ghumar Mandi'],
          },
        ],
      },
      {
        name: 'Amritsar District',
        cities: [
          {
            name: 'Amritsar',
            places: ['Ranjit Avenue', 'Lawrence Road', 'Hall Bazar', 'Mall Road Amritsar'],
          },
        ],
      },
      {
        name: 'SAS Nagar (Mohali)',
        cities: [
          {
            name: 'Mohali',
            places: ['Phase 7 Mohali', 'Sector 70', 'Airport Road Mohali', 'IT City Mohali'],
          },
        ],
      },
      {
        name: 'Jalandhar District',
        cities: [
          {
            name: 'Jalandhar',
            places: ['Model Town Jalandhar', 'GT Road', 'Rama Mandi'],
          },
        ],
      },
    ],
  },
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    type: 'State',
    lat: '15.9129',
    lng: '79.7400',
    districts: [
      {
        name: 'Visakhapatnam District',
        cities: [
          {
            name: 'Visakhapatnam',
            places: ['Dwaraka Nagar', 'MVP Colony', 'Siripuram', 'Beach Road', 'Gajuwaka', 'Madhurawada'],
          },
        ],
      },
      {
        name: 'NTR (Vijayawada) District',
        cities: [
          {
            name: 'Vijayawada',
            places: ['MG Road (Bandar Road)', 'Benz Circle', 'Governorpet', 'Labbipet'],
          },
        ],
      },
      {
        name: 'Guntur District',
        cities: [
          {
            name: 'Guntur',
            places: ['Brodipet', 'Arundelpet', 'Lakshmipuram'],
          },
        ],
      },
      {
        name: 'Tirupati District',
        cities: [
          {
            name: 'Tirupati',
            places: ['AIR Bypass Road', 'VV Mahal Road', 'Tilak Road'],
          },
        ],
      },
    ],
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    type: 'State',
    lat: '22.9734',
    lng: '78.6569',
    districts: [
      {
        name: 'Indore District',
        cities: [
          {
            name: 'Indore',
            places: ['Vijay Nagar', 'South Tukoganj', 'Sapna Sangeeta', 'MG Road Indore', 'Sarafa Bazar', 'Palasia'],
          },
        ],
      },
      {
        name: 'Bhopal District',
        cities: [
          {
            name: 'Bhopal',
            places: ['MP Nagar', 'Arera Colony', 'New Market Bhopal', 'Kolar Road'],
          },
        ],
      },
      {
        name: 'Jabalpur & Gwalior',
        cities: [
          {
            name: 'Jabalpur',
            places: ['Napier Town', 'Wright Town', 'City Center Gwalior', 'Lashkar'],
          },
        ],
      },
    ],
  },
  {
    code: 'BR',
    name: 'Bihar',
    type: 'State',
    lat: '25.0961',
    lng: '85.3131',
    districts: [
      {
        name: 'Patna District',
        cities: [
          {
            name: 'Patna',
            places: ['Boring Road', 'Frazer Road', 'Kankarbagh', 'Bailey Road', 'Exhibition Road', 'Patliputra Colony'],
          },
        ],
      },
      {
        name: 'Muzaffarpur & Gaya',
        cities: [
          {
            name: 'Muzaffarpur',
            places: ['Mithanpura', 'Motijheel', 'AP Colony Gaya'],
          },
        ],
      },
    ],
  },
  {
    code: 'OR',
    name: 'Odisha',
    type: 'State',
    lat: '20.9517',
    lng: '85.0985',
    districts: [
      {
        name: 'Khordha District',
        cities: [
          {
            name: 'Bhubaneswar',
            places: ['Saheed Nagar', 'Patia', 'Janpath Bhubaneswar', 'Jayadev Vihar', 'Nayapalli', 'Chandrasekharpur'],
          },
        ],
      },
      {
        name: 'Cuttack District',
        cities: [
          {
            name: 'Cuttack',
            places: ['Naya Sarak', 'Choudhury Bazar', 'CDA Sector 6'],
          },
        ],
      },
    ],
  },
  {
    code: 'AS',
    name: 'Assam',
    type: 'State',
    lat: '26.2006',
    lng: '92.9376',
    districts: [
      {
        name: 'Kamrup Metropolitan',
        cities: [
          {
            name: 'Guwahati',
            places: ['GS Road', 'Christian Basti', 'Zoo Road', 'Fancy Bazar', 'Beltola', 'Paltan Bazar'],
          },
        ],
      },
      {
        name: 'Dibrugarh & Jorhat',
        cities: [
          {
            name: 'Dibrugarh',
            places: ['HS Road', 'AT Road Jorhat', 'Gar-Ali'],
          },
        ],
      },
    ],
  },
  {
    code: 'CG',
    name: 'Chhattisgarh',
    type: 'State',
    lat: '21.2787',
    lng: '81.8661',
    districts: [
      {
        name: 'Raipur District',
        cities: [
          {
            name: 'Raipur',
            places: ['Pandri', 'Shankar Nagar', 'Civil Lines Raipur', 'Sadar Bazar Raipur', 'Telibandha'],
          },
        ],
      },
      {
        name: 'Durg & Bilaspur',
        cities: [
          {
            name: 'Bhilai & Bilaspur',
            places: ['Nehru Nagar Bhilai', 'Civic Centre', 'Vyapar Vihar Bilaspur'],
          },
        ],
      },
    ],
  },
  {
    code: 'JH',
    name: 'Jharkhand',
    type: 'State',
    lat: '23.6102',
    lng: '85.2799',
    districts: [
      {
        name: 'Ranchi District',
        cities: [
          {
            name: 'Ranchi',
            places: ['Main Road Ranchi', 'Lalpur', 'Ashok Nagar', 'Kanke Road', 'Doranda'],
          },
        ],
      },
      {
        name: 'East Singhbhum',
        cities: [
          {
            name: 'Jamshedpur',
            places: ['Bistupur', 'Sakchi', 'Sonari', 'Kadma'],
          },
        ],
      },
    ],
  },
  {
    code: 'UK',
    name: 'Uttarakhand',
    type: 'State',
    lat: '30.0668',
    lng: '79.0193',
    districts: [
      {
        name: 'Dehradun District',
        cities: [
          {
            name: 'Dehradun',
            places: ['Rajpur Road', 'GMS Road', 'Paltan Bazaar', 'Vasant Vihar Dehradun'],
          },
        ],
      },
      {
        name: 'Haridwar & Nainital',
        cities: [
          {
            name: 'Haldwani & Haridwar',
            places: ['Nainital Road Haldwani', 'Ranipur More Haridwar', 'Rishikesh Tapovan'],
          },
        ],
      },
    ],
  },
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    type: 'State',
    lat: '31.1048',
    lng: '77.1734',
    districts: [
      {
        name: 'Shimla District',
        cities: [
          {
            name: 'Shimla',
            places: ['Mall Road Shimla', 'Lower Bazar', 'New Shimla', 'Sanjauli'],
          },
        ],
      },
      {
        name: 'Kangra & Kullu',
        cities: [
          {
            name: 'Dharamshala & Manali',
            places: ['McLeod Ganj', 'Kotwali Bazar', 'Mall Road Manali'],
          },
        ],
      },
    ],
  },
  {
    code: 'GA',
    name: 'Goa',
    type: 'State',
    lat: '15.2993',
    lng: '74.1240',
    districts: [
      {
        name: 'North Goa',
        cities: [
          {
            name: 'Panaji & Mapusa',
            places: ['18th June Road Panaji', 'Miramar', 'Porvorim', 'Calangute', 'Candolim', 'Assagao'],
          },
        ],
      },
      {
        name: 'South Goa',
        cities: [
          {
            name: 'Margao',
            places: ['Pajifond', 'Fatorda', 'Colva', 'Vasco da Gama'],
          },
        ],
      },
    ],
  },
  {
    code: 'CH',
    name: 'Chandigarh',
    type: 'Union Territory',
    lat: '30.7333',
    lng: '76.7794',
    districts: [
      {
        name: 'Chandigarh District',
        cities: [
          {
            name: 'Chandigarh',
            places: ['Sector 17 Plaza', 'Sector 35', 'Sector 8', 'Sector 9', 'Elante Industrial Area Phase I', 'Sector 22'],
          },
        ],
      },
    ],
  },
  {
    code: 'JK',
    name: 'Jammu and Kashmir',
    type: 'Union Territory',
    lat: '33.7782',
    lng: '76.5762',
    districts: [
      {
        name: 'Srinagar District',
        cities: [
          {
            name: 'Srinagar',
            places: ['Lal Chowk', 'Rajbagh', 'Residency Road', 'Karan Nagar'],
          },
        ],
      },
      {
        name: 'Jammu District',
        cities: [
          {
            name: 'Jammu',
            places: ['Gandhi Nagar Jammu', 'Channi Himmat', 'Raghunath Bazar', 'Trikuta Nagar'],
          },
        ],
      },
    ],
  },
  {
    code: 'PY',
    name: 'Puducherry',
    type: 'Union Territory',
    lat: '11.9416',
    lng: '79.8083',
    districts: [
      {
        name: 'Puducherry District',
        cities: [
          {
            name: 'Puducherry',
            places: ['White Town', 'MG Road Puducherry', 'Mission Street', 'Anna Salai', 'Lawspet'],
          },
        ],
      },
    ],
  },
  {
    code: 'AR',
    name: 'Arunachal Pradesh',
    type: 'State',
    lat: '28.2180',
    lng: '94.7278',
    districts: [
      {
        name: 'Papum Pare',
        cities: [
          {
            name: 'Itanagar',
            places: ['Bank Tinali', 'Ganga Market', 'Naharlagun'],
          },
        ],
      },
    ],
  },
  {
    code: 'MN',
    name: 'Manipur',
    type: 'State',
    lat: '24.6637',
    lng: '93.9063',
    districts: [
      {
        name: 'Imphal West',
        cities: [
          {
            name: 'Imphal',
            places: ['Paona Bazar', 'Thangal Bazar', 'Uripok'],
          },
        ],
      },
    ],
  },
  {
    code: 'ML',
    name: 'Meghalaya',
    type: 'State',
    lat: '25.4670',
    lng: '91.3662',
    districts: [
      {
        name: 'East Khasi Hills',
        cities: [
          {
            name: 'Shillong',
            places: ['Police Bazar', 'Laitumkhrah', 'Bara Bazar'],
          },
        ],
      },
    ],
  },
  {
    code: 'MZ',
    name: 'Mizoram',
    type: 'State',
    lat: '23.1645',
    lng: '92.9376',
    districts: [
      {
        name: 'Aizawl District',
        cities: [
          {
            name: 'Aizawl',
            places: ['Zarkawt', 'Bara Bazar Aizawl', 'Chanmari'],
          },
        ],
      },
    ],
  },
  {
    code: 'NL',
    name: 'Nagaland',
    type: 'State',
    lat: '26.1584',
    lng: '94.5624',
    districts: [
      {
        name: 'Dimapur & Kohima',
        cities: [
          {
            name: 'Dimapur & Kohima',
            places: ['NL Road Dimapur', 'Circular Road', 'PR Hill Kohima'],
          },
        ],
      },
    ],
  },
  {
    code: 'SK',
    name: 'Sikkim',
    type: 'State',
    lat: '27.5330',
    lng: '88.5122',
    districts: [
      {
        name: 'Gangtok District',
        cities: [
          {
            name: 'Gangtok',
            places: ['MG Marg Gangtok', 'Tadong', 'Deorali'],
          },
        ],
      },
    ],
  },
  {
    code: 'TR',
    name: 'Tripura',
    type: 'State',
    lat: '23.9408',
    lng: '91.9882',
    districts: [
      {
        name: 'West Tripura',
        cities: [
          {
            name: 'Agartala',
            places: ['HG Basak Road', 'Kaman Chowmuhani', 'Krishnanagar'],
          },
        ],
      },
    ],
  },
  {
    code: 'AN',
    name: 'Andaman and Nicobar Islands',
    type: 'Union Territory',
    lat: '11.7401',
    lng: '92.6586',
    districts: [
      {
        name: 'South Andaman',
        cities: [
          {
            name: 'Port Blair',
            places: ['Aberdeen Bazar', 'Junglighat', 'Haddo'],
          },
        ],
      },
    ],
  },
  {
    code: 'DN',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'Union Territory',
    lat: '20.1809',
    lng: '73.0169',
    districts: [
      {
        name: 'Silvassa & Daman',
        cities: [
          {
            name: 'Silvassa & Daman',
            places: ['Vapi-Silvassa Road', 'Kilvani Road', 'Nani Daman'],
          },
        ],
      },
    ],
  },
  {
    code: 'LA',
    name: 'Ladakh',
    type: 'Union Territory',
    lat: '34.1526',
    lng: '77.5771',
    districts: [
      {
        name: 'Leh District',
        cities: [
          {
            name: 'Leh',
            places: ['Main Bazaar Leh', 'Changspa Road', 'Fort Road Leh'],
          },
        ],
      },
    ],
  },
  {
    code: 'LD',
    name: 'Lakshadweep',
    type: 'Union Territory',
    lat: '10.5667',
    lng: '72.6417',
    districts: [
      {
        name: 'Lakshadweep District',
        cities: [
          {
            name: 'Kavaratti',
            places: ['Kavaratti Island', 'Agatti', 'Minicoy'],
          },
        ],
      },
    ],
  },
];
