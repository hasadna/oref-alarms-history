
main = {};

main.controller = {

    start: function(){
        main.model.loadData(function(){
            main.view.initialDataIsReady();
        });
    },

    onTypeaheadType: function(q, cb){
        main.model.getCitiesStartsWith(q, function(cities){
            var ans = [];
            $.each(cities, function(i, city) {
                ans.push({
                    'value': city.name,
                    'city_id': city.id
                })
            });
            cb(ans);
        });
    },

    onTypeaheadSelected: function(obj) {
        var l = main.model.getLastAlertData(obj.city_id);
        main.view.setShowerAnswer(l.diff > main.view.getShowerThreshold(), l.lastalerts, l.nearestalert);
    }

};

main.model = {

    loadData: function(cb) {
        var self = this;
        var regions, alerts;
        var _done = function(){
            if (typeof(regions) != 'undefined' && typeof(alerts) != 'undefined') {
                self._processData(regions, alerts, function(){
                    cb();
                });
            }
        };
        $.get('../scraper/regions.json', function(data){
            regions = data;
            _done();
        });
        $.get('../scraper/alerts.json', function(data){
            alerts = data;
            _done();
        });
    },

    /**
     * find cities which name starts with the given string
     * @param q string, the string to look for
     * @param cb callback function, gets a cities parameter which is an array of matched city objects
     */
    getCitiesStartsWith: function(q, cb) {
        var self = main.model;
        var cities = [];
        q = $.trim(q);
        $.each(self._cities, function(i, city){
            if ($.trim(city.name).indexOf(q) == 0) {
                cities.push(city);
            }
        });
        cb(cities);
    },

    getLastAlertData: function(city_id){
        var self = main.model;
        var city = self._cities[city_id];
        var region = self._regions[city.region_id];
        var name = region.name;
        var d = new Date();
        var curmins = d.getHours()*60+ d.getMinutes();
        var lastalertdiff = 1500;
        var lastalert = '';
        var lastalerts = [];
        $.each(self._alerts, function(datetime, region_names){
            if ($.inArray(name, region_names) > -1) {
                lastalerts.push(datetime);
                var minshours = datetime.split(' ')[1].split(':');
                var mins = parseInt(minshours[0])*60+parseInt(minshours[1]);
                var diff = Math.abs(mins - curmins);
                if (diff < lastalertdiff) {lastalertdiff = diff;lastalert = datetime;}
                diff = Math.abs(mins+1440 - curmins);
                if (diff < lastalertdiff) {lastalertdiff = diff;lastalert = datetime;}
                diff = Math.abs(mins-1440 - curmins);
                if (diff < lastalertdiff) {lastalertdiff = diff;lastalert = datetime;}
            }
        });
        return {
            'nearestalert': lastalert,
            'lastalerts': lastalerts,
            'diff': lastalertdiff
        };
    },

    _processData: function(regions, alerts, cb) {
        var self = this;
        self._alerts = alerts;
        self._cities = [];
        self._regions = [];
        $.each(regions, function(i, region) {
            var region_id = self._regions.length;
            self._regions.push({
                'id': region_id,
                'name': region.name
            });
            $.each(region.cities.split(','), function(i, city){
                var city_name = $.trim(city);
                if (city_name.length > 0) {
                    var city_id = self._cities.length;
                    self._cities.push({
                        'id': city_id,
                        'name': $.trim(city),
                        'region_id': region_id
                    });
                }
            });
        });
        cb();
    }

};

main.view = {

    curTypeaheadObj: null,

    initialDataIsReady: function(){
        $('#mainform').removeClass('hidden');
        $('#loading_data').addClass('hidden');
        this._initTypeahead();
        var self = this;
        $('#mainform select').bind('change', function(){
            main.controller.onTypeaheadSelected(self.curTypeaheadObj);
        });
    },

    setShowerAnswer: function(ans, lastalerts, nearestalert){
        $('#shower_answer').removeClass('hidden');
        if (ans) {
            $('#shower_answer .yes').removeClass('hidden');
            $('#shower_answer .no').addClass('hidden');
        } else {
            $('#shower_answer .yes').addClass('hidden');
            $('#shower_answer .no').removeClass('hidden');
        }
        if (nearestalert.length == 0) {
            $('#shower_answer .details').html('לא היו אזעקות ביישוב כלל לפי הנתונים שבידינו');
        } else {
            $('#shower_answer .details').html('האזעקה בשעה הכי קרובה לשעה הנוכחית הייתה ב: '+nearestalert);
        }
    },

    getShowerThreshold: function() {
        return $('#mainform select').val();
    },

    _initTypeahead: function(){
        var self = this;
        $('#mainform .typeahead').typeahead({}, {
            'source': function(q, cb) {
                $('#shower_answer').addClass('hidden');
                self.curTypeaheadObj = null;
                main.controller.onTypeaheadType(q, cb);
            }
        }).bind('typeahead:selected', function(e, obj) {
            self.curTypeaheadObj = obj;
            main.controller.onTypeaheadSelected(obj);
        });
    }

};

$(function(){
    main.controller.start();
});
