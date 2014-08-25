# -*- coding: utf-8 -*-

from __future__ import print_function
from datetime import date, timedelta, datetime
import urllib2
import re
import json
import demjson

def get_alerts():
    baseurl = "http://www.oref.org.il//Shared/Ajax/GetAlarms.aspx?md=%d7%94%d7%aa%d7%a8%d7%a2%d7%94+%d7%91%d7%9e%d7%a8%d7%97%d7%91&fromDate={fromDate}&toDate={toDate}"
    alerts = {}
    cur_date = date(2014, 7, 27)
    end_date = date.today()
    print('scraping alerts from %s to %s'%(cur_date, end_date))
    while cur_date <= end_date:
        print(cur_date)
        url = baseurl.format(fromDate=cur_date.strftime('%d/%m/%Y'), toDate=cur_date.strftime('%d/%m/%Y'))
        data = urllib2.urlopen(url).read(1000000)
        res = re.findall('\<strong\>(\d\d/\d\d/\d\d\d\d \d\d\:\d\d) \- \</strong\>התרעה במרחב (.*)', data)
        for i in res:
            alert_datetime = datetime.strptime(i[0], "%d/%m/%Y %H:%M").strftime('%d/%m/%Y %H:%M')
            alerts[alert_datetime] = []
            regions = i[1]
            regions = regions.split(',')
            for region in regions:
                region = region.strip()
                alerts[alert_datetime].append(region)
        cur_date += timedelta(days=1)
    return alerts

def get_region_names():
    print('scraping region names')
    # if this stops working for some reason, you can change it to use the regions_source_data.js file instead
    url = 'http://www.oref.org.il/11036-he/Pakar.aspx'
    data = urllib2.urlopen(url).read(10000000)
    data = data.replace("\n", "").replace("\r", "")
    res = re.search('var spaces = \[([^\]]*)\]', data)
    region_names_json = '[%s]'%res.group(1)
    region_names = demjson.decode(region_names_json)
    return region_names

def get_region_cities():
    print('scraping region cities')
    # if this stops working for some reason, you can change it to use the cities_source_data.js file instead
    url = 'http://www.oref.org.il/11036-he/Pakar.aspx'
    data = urllib2.urlopen(url).read(10000000)
    data = data.replace("\n", "").replace("\r", "")
    res = re.search('var citiesArr = \{([^\}]*)\}', data)
    region_cities_json = '{%s}'%res.group(1)
    region_cities = demjson.decode(region_cities_json)
    return region_cities

def get_regions_data(region_names, region_cities):
    print('combining the region names and cities data')
    regions = []
    for region in region_names:
        region_name = region[u'label']
        region_id = region[u'value']
        regions.append({
            'name': region_name,
            'region_city_id': region_id,
            'cities': region_cities[region_id] if region_cities.has_key(region_id) else ''
        })
    return regions

def save_jsons():
    alerts = get_alerts()
    print('saving alerts to json file')
    with open('alerts.json', 'w') as f:
        json.dump(alerts, f)
    regions = get_regions_data(get_region_names(), get_region_cities())
    print('saving regions to json file')
    with open('regions.json', 'w') as f:
        json.dump(regions, f)

save_jsons()