var myApp = angular.module('myApp', ['elasticsearch','ngMap']);


myApp.service('client', function (esFactory) {
    return esFactory({
        host: 'https://YSe48YMha:a1c8ad0b-4e25-4647-b7f6-e39e1ded8d03@scalr.api.appbase.io',
    });
});


myApp.controller('controller', function ($scope, client, esFactory, $interval,$window) {
  
    var streamingClient = new Appbase({
      url: 'https://scalr.api.appbase.io',
      appname: 'Check In',
      username: 'YSe48YMha',
      password: 'a1c8ad0b-4e25-4647-b7f6-e39e1ded8d03'
    });
    
    
    var response,                   //global variable to store response from appbase
        citysearched,
        geocoder = new google.maps.Geocoder(),
        infowindow = new google.maps.InfoWindow(),
        identifyStreaming,          //parameter to identify streaming
        checkin = [],               //global variable to store checkins of one city
        categorylist = [],           //global variable to store categories of one city
        streamedCheckin = [],
        renderarray = [];

    $scope.detailbox=false;
    $scope.zoomlevel = 2;
    
    
    //initialize the map
    $scope.init = function(){
        $scope.$on('mapInitialized', function(event, map) {
            $scope.center = [0,0];
            $scope.objMapa = map;
            $scope.$apply();
        });
    };
    
    
    $scope.opencheckin = function(event,details){
      $window.open('https://'+details,'_blank');
    }
    
    
    $scope.changesearchtext = function(text){
        $scope.searchtext = text;
        $scope.row = false;
        $scope.$apply();
    }
    
    
    $scope.showwindow = function(e,data,visible){
      if(visible){
         infowindow.setContent('<table><tr><td>' + '<img src="'+ data[6] + '">' + '</td>' + '<td>' + '<b>'+ data[8] + ' says ' +'</b>' + data[0] + '<br><b>Place : </b>' + data[7] + '</td></tr>'+'</table>');
         var center;
         if($scope.objMapa.getZoom()==0) centre = new google.maps.LatLng(data[1],data[2]);
         else if($scope.objMapa.getZoom()<=3 && $scope.objMapa.getZoom()>0) center = new google.maps.LatLng(data[1]+11/$scope.objMapa.getZoom(),data[2]-5/$scope.objMapa.getZoom());
         else if($scope.objMapa.getZoom()>3 && $scope.objMapa.getZoom()<=8) center = new google.maps.LatLng(data[1]+4/$scope.objMapa.getZoom(),data[2]-1/$scope.objMapa.getZoom());
         else center = new google.maps.LatLng(data[1]+0.2/$scope.objMapa.getZoom(),data[2]-0.08/$scope.objMapa.getZoom());
         infowindow.setPosition(center);
         infowindow.open($scope.objMapa);
      }else{
         infowindow.close();
         infowindow = new google.maps.InfoWindow();
      }
    };
    
    
    $scope.searchquerry = function(){
        try{
            //searchtext variable referred to the text in search box
            if($scope.searchtext!=null && $scope.searchtext.replace(/\s/g,'').length){  //to check if search text is null
              
                client.suggest({
                    index: 'Check In',
                    body: {
                      mysuggester: {
                        text: $scope.searchtext,
                        completion: {
                          field: 'city_suggest'
                        }
                      }
                    }
                }, function (error, response) {
                    //response contains suggested cities
                    $scope.suggestions = response.mysuggester[0].options;
                    $scope.row = true;
                });
                
            }else{
                $scope.suggestions = null;
                $scope.row = false;
            }
            
        }catch(e){
            console.log('error');
        }
        
    };
    
    
    $scope.showcategory = function(data){
        
        var places = [];
        
        if(categorylist[data]==true) categorylist[data]=false;
        else categorylist[data]=true;
        
        for(var i=0;i<checkin.length;i++){
          
            if(categorylist[checkin[i][4]] == true){
                var arr = [];
                arr[0] = checkin[i][0];
                arr[1] = checkin[i][1];
                arr[2] = checkin[i][2];
                arr[3] = 1;
                arr[4] = checkin[i][4];
                arr[5] = checkin[i][5];
                arr[6] = checkin[i][6];
                arr[7] = checkin[i][7];
                arr[8] = checkin[i][8];
                arr[9] = checkin[i][9];
                places.push(arr);
            }
            
        }
        
        $scope.beaches = places;
    };
    
    
    //streaming data from appbase
    $scope.getData = function(){
        
          client.search({
            index: 'Check In',
            type: 'city',
            body: {
               query : {
                  match: {
                      city : $scope.searchtext
                  }
                }
             }
           }).then(function(res) {
             
              checkin = []; 
              categorylist = [];
              citysearched = $scope.searchtext;
              $scope.row = false;    //to hide suggestions
              $scope.$apply();
              processStreams(res);  //to fetch the data and to mark it on map
           }, function(err){
             console.log("caught a stream error", err);
           });
        
    };
    
        
     function processStreams (res){
       
       if($scope.searchtext!=null && $scope.searchtext.replace(/\s/g,'').length){
         response = res;
         //console.log("res"+JSON.stringify(res.hits));
            
         if(response.hits){
           
            for(var i=0;i<response.hits.hits.length;i++){ 
              
              if(response.hits.hits[i]){
                if( response.hits.hits[i]._source){
                  if(response.hits.hits[i]._source.category){
                    
                    categorylist[response.hits.hits[i]._source.category] = true;
                    var arr = [];                 //creating array to publish details on map
                    arr[0] = response.hits.hits[i]._source.shout;
                    arr[1] = response.hits.hits[i]._source.latitude;
                    arr[2] = response.hits.hits[i]._source.longitude;
                    arr[3] = 1;
                    arr[4] = response.hits.hits[i]._source.category;
                    arr[5] = response.hits.hits[i]._source.url;
                    arr[6] = response.hits.hits[i]._source.photourl;
                    arr[7] = response.hits.hits[i]._source.venue;
                    arr[8] = response.hits.hits[i]._source.username;
                    arr[9] = 'red_marker.png';
                    checkin.push(arr);
                  }
                }
              }
            }
          }
          
          //GeoCoding to search the city
    
          geocoder.geocode( { "address": $scope.searchtext }, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK && results.length > 0) {
               
               var location = results[0].geometry.location,
               lat  = location.lat(),
               lng  = location.lng();
               $scope.center = [lat,lng];
               $scope.objMapa.setZoom(11);
               $scope.$apply();
               
            }
          });
          renderarray = [];
          renderarray.push.apply(renderarray,checkin);
          if(streamedCheckin!=null) renderarray.push.apply(renderarray,streamedCheckin);
          $scope.beaches = renderarray;
          $scope.subjects = createJson(categorylist,Object.keys(categorylist));
          $scope.$digest(); 
          $scope.$apply();
          
       }
    }
    
    
    streamingClient.streamSearch({
        type: 'city',
        size: 200,
        body: {
            query: {
              match_all: {}
            }
        },
        streamonly: true
        }).on('data', function(res) {

             streamNewData(res);  //to fetch the data and to mark it on map

        }).on('error', function(err) {
           console.log("caught a stream error", err);
    
      });
      
      
    function streamNewData(response){
 
       if(response._source){
          var arr = [];                 //creating array to publish details on map
          arr[0] = response._source.shout;
          arr[1] = response._source.latitude;
          arr[2] = response._source.longitude;
          arr[3] = 1;
          arr[4] = response._source.category;
          arr[5] = response._source.url;
          arr[6] = response._source.photourl;
          arr[7] = response._source.venue;
          arr[8] = response._source.username;
          arr[9] = 'blue_marker.png';
          arr[10] = response._source.city;
          streamedCheckin.push(arr);
          renderarray = [];
          if(checkin!=null)renderarray.push.apply(renderarray,checkin);
          renderarray.push.apply(renderarray,streamedCheckin);
          $scope.beaches = renderarray;
          $scope.$apply();
       }
    }
    
    
    //Json data to render dynamic checkbox
    function createJson(key,array){
      var json = [];
      for(var i=0;i<array.length;i++){
        var object = {
                name: array[i],
                value: true
            };
            json.push(object);
        }
        return json;
    }
  
    var removecheckin = function (){
         if(citysearched==streamedCheckin[0][10]){
            streamedCheckin[0][9] = 'red_marker.png';
            checkin.push(streamedCheckin[0]);
            categorylist[streamedCheckin[0][4]] = true;
            $scope.subjects = createJson(categorylist,Object.keys(categorylist));
         }
         if(streamedCheckin!=null){
            renderarray = [];
            streamedCheckin.splice(0,1);
            if(streamedCheckin!=null)renderarray.push.apply(renderarray,streamedCheckin); 
            if(checkin!=null)renderarray.push.apply(renderarray,checkin);
            $scope.beaches = renderarray;
            $scope.$apply();
         }
    }  
    
    //$interval(removecheckin,5000);

});
