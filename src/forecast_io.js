/* jshint esnext:true */
/*
 *
 *  Weather extension for GNOME Shell
 *  - Displays a small weather information on the top panel.
 *  - On click, gives a popup with details about the weather.
 *
 * Copyright (C) 2011 - 2015
 *     ecyrbe <ecyrbe+spam@gmail.com>,
 *     Timur Kristof <venemo@msn.com>,
 *     Elad Alfassa <elad@fedoraproject.org>,
 *     Simon Legner <Simon.Legner@gmail.com>,
 *     Christian METZLER <neroth@xeked.com>,
 *     Mark Benjamin weather.gnome.Markie1@dfgh.net,
 *     Mattia Meneguzzo odysseus@fedoraproject.org,
 *     Meng Zhuo <mengzhuo1203+spam@gmail.com>,
 *     Jens Lody <jens@jenslody.de>
 *
 *
 * This file is part of gnome-shell-extension-openweather.
 *
 * gnome-shell-extension-openweather is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-openweather is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-openweather.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

//const ExtensionUtils = imports.misc.extensionUtils;
//const Me = ExtensionUtils.getCurrentExtension();
//const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain('gnome-shell-extension-openweather');
const _ = Gettext.gettext;


const OPENWEATHER_URL_HOST = 'api.forecast.io';
const OPENWEATHER_URL_BASE = 'http://' + OPENWEATHER_URL_HOST + '/forecast/';

function getWeatherIcon(icon) {
    //    clear-day             weather-clear-day
    //    clear-night           weather-clear-night
    //    rain                  weather-showers
    //    snow                  weather-snow
    //    sleet                 weather-snow
    //    wind                  weather-storm
    //    fog                   weather-fog
    //    cloudy                weather-overcast
    //    partly-cloudy-day     weather-few-clouds
    //    partly-cloudy-night   weather-few-clouds-night
    let iconname = ['weather-severe-alert'];
    switch (icon) {
        case 'wind':
            iconname = ['weather-storm'];
            break;
        case 'rain':
            iconname = ['weather-showers-scattered', 'weather-showers'];
            break;
        case 'sleet':
        case 'snow':
            iconname = ['weather-snow'];
            break;
        case 'fog':
            iconname = ['weather-fog'];
            break;
        case 'clear-day': //sky is clear
            iconname = ['weather-clear'];
            break;
        case 'clear-night': //sky is clear
            iconname = ['weather-clear-night'];
            break;
        case 'partly-cloudy-day':
            iconname = ['weather-few-clouds'];
            break;
        case 'partly-cloudy-night':
            iconname = ['weather-few-clouds-night'];
            break;
        case 'cloudy':
            iconname = ['weather-overcast'];
            break;
    }
    for (let i = 0; i < iconname.length; i++) {
            if (this.hasIcon(iconname[i]))
            return iconname[i] + this.getIconType();
    }
    return 'weather-severe-alert' + this.getIconType();
}

function parseWeatherCurrent() {
    if (this.currentWeatherCache === undefined) {
            this.refreshWeatherCurrent();
        return;
    }

    this.checkPositionInPanel();

    let json = this.currentWeatherCache;

    this.owmCityId = 0;
    // Refresh current weather
    let location = this.extractLocation(this._city);

    let comment = json.summary;

    let temperature = this.formatTemperature(json.temperature);

    let now = new Date();

    let iconname = this.getWeatherIcon(json.icon);

    if (this.lastBuildId === undefined)
        this.lastBuildId = 0;

    if (this.lastBuildDate === undefined)
        this.lastBuildDate = 0;

    if (this.lastBuildId != json.time || !this.lastBuildDate) {
        this.lastBuildId = json.time;
        this.lastBuildDate = new Date(this.lastBuildId * 1000);
    }

    let lastBuild = '-';

    if (this._clockFormat == "24h")
        lastBuild = this.lastBuildDate.toLocaleFormat("%R");
    else
        lastBuild = this.lastBuildDate.toLocaleFormat("%I:%M %p");

    let beginOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    let d = Math.floor((this.lastBuildDate.getTime() - beginOfDay.getTime()) / 86400000);
    if (d < 0) {
        lastBuild = _("Yesterday");
        if (d < -1)
        {
            d *= -1;
            lastBuild = ngettext("%d day ago","%d days ago", d).format(d);
        }
    }

    this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;

    let weatherInfoC = "";
    let weatherInfoT = "";
    if (this._comment_in_panel)
        weatherInfoC = comment;

    if (this._text_in_panel)
        weatherInfoT = temperature;

    this._weatherInfo.text = weatherInfoC + ((weatherInfoC && weatherInfoT) ? ", " : "") + weatherInfoT;

    this._currentWeatherSummary.text = comment + ", " + temperature;
    this._currentWeatherLocation.text = location;
    this._currentWeatherCloudiness.text = parseInt(json.cloudCover * 100) + ' %';
    this._currentWeatherHumidity.text = parseInt(json.humidity * 100) + ' %';
    this._currentWeatherPressure.text = this.formatPressure(json.pressure);

    this._currentWeatherBuild.text = lastBuild;

    this._currentWeatherWind.text = this.formatWind(json.windSpeed, this.getWindDirection(json.windBearing));

    this.parseWeatherForecast();
    this.recalcLayout();
}

function refreshWeatherCurrent() {
    this.oldLocation = this.extractCoord(this._city);

    let params = {
        exclude: 'minutely,hourly,alerts,flags',
        lang: this.fc_locale,
        units: 'si'
    };
    let url = OPENWEATHER_URL_BASE + this._appid_fc + '/' + this.oldLocation;
    this.load_json_async(url, params, function(json) {
        if (json && json.currently) {

            if (this.currentWeatherCache != json.currently)
                this.currentWeatherCache = json.currently;

            if (json.daily && json.daily.data) {
                if (this.forecastWeatherCache != json.daily.data)
                    this.forecastWeatherCache = json.daily.data;
            }

            this.rebuildSelectCityItem();

            this.parseWeatherCurrent();
        } else {
            this.reloadWeatherCurrent(600);
        }
    });
    this.reloadWeatherCurrent(this._refresh_interval_current);
}

function parseWeatherForecast() {
    if (this.forecastWeatherCache === undefined) {
        this.refreshWeatherCurrent();
        return;
    }

    let forecast = this.forecastWeatherCache;
    let beginOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    let cnt = Math.min(this._days_forecast, forecast.length);
    if (cnt != this._days_forecast)
        this.rebuildFutureWeatherUi(cnt);

    // Refresh forecast
    for (let i = 0; i < cnt; i++) {
        let forecastUi = this._forecast[i];
        let forecastData = forecast[i];
        if (forecastData === undefined)
            continue;

        let t_low = this.formatTemperature(forecastData.temperatureMin);
        let t_high = this.formatTemperature(forecastData.temperatureMax);


        let comment = forecastData.summary;
        let forecastDate = new Date(forecastData.time * 1000);
        let dayLeft = Math.floor((forecastDate.getTime() - beginOfDay.getTime()) / 86400000);

        let date_string = _("Today");

        let sunrise = new Date(forecastData.sunriseTime * 1000);
        let sunset = new Date(forecastData.sunsetTime * 1000);

        if (dayLeft === 0) {
            if (this._clockFormat == "24h") {
                sunrise = sunrise.toLocaleFormat("%R");
                sunset = sunset.toLocaleFormat("%R");
            } else {
                sunrise = sunrise.toLocaleFormat("%I:%M %p");
                sunset = sunset.toLocaleFormat("%I:%M %p");
            }
            this._currentWeatherSunrise.text = sunrise;
            this._currentWeatherSunset.text = sunset;
        } else if (dayLeft == 1)
            date_string = _("Tomorrow");
        else if (dayLeft > 1)
            date_string = ngettext("In %d day","In %d days",dayLeft).format(dayLeft);
        else if (dayLeft == -1)
            date_string = _("Yesterday");
        else if (dayLeft < -1)
        {
            dayLeft *= -1;
            date_string = ngettext("%d day ago","%d days ago",dayLeft).format(dayLeft);
        }

        forecastUi.Day.text = date_string + ' (' + this.getLocaleDay(forecastDate.getDay()) + ')\n' + forecastDate.toLocaleDateString();
        forecastUi.Temperature.text = '\u2193 ' + t_low + '    \u2191 ' + t_high;
        forecastUi.Summary.text = comment;
            forecastUi.Icon.icon_name = this.getWeatherIcon(forecastData.icon);
        }
}
