const commonModal = require('client/components/modal_common/index');
const config = require('./config.json');
const request = require('../../request');
const __ = require('locale/client/dashboard.lang.json');

function pop(obj, parent, callback) {
  let slider = config.fields[0];
  slider.min = obj.size;
  slider.max = obj.size;
  slider.value = obj.size;

  let props = {
    __: __,
    parent: parent,
    config: config,
    onInitialize: function(refs) {
      request.getOverview().then((overview) => {
        let max, total, used;

        //capacity of the type
        let capacity = overview.overview_usage['gigabytes_' + obj.volume_type];

        //capacity of all the types
        let allCapacity = overview.overview_usage.gigabytes;

        //capacity set by user
        let settings = HALO.settings;
        let singleMax = settings.max_single_gigabytes ? settings.max_single_gigabytes : 1000;

        //capacity set by front-end side
        let defaultTotal = 1000;

        if (capacity.total < 0) {
          if (allCapacity.total < 0) {
            if (settings.total_gigabytes) {
              total = settings.total_gigabytes;
            } else {
              total = defaultTotal;
            }
          } else {
            total = allCapacity.total;
          }
          used = allCapacity.used;
        } else {
          total = capacity.total;
          used = capacity.used;
        }

        max = (total - used) + obj.size;
        if (max > singleMax) {
          if (obj.size < singleMax) {
            max = singleMax;
          } else {
            max = obj.size;
          }
        }

        let setStates = (res, enableCharge, isError) => {
          refs.capacity_size.setState({
            max: max,
            value: obj.size,
            disabled: false
          });

          refs.btn.setState({
            disabled: false
          });

          if (enableCharge && !isError) {
            refs.charge.setState({
              value: res.unit_price,
              hide: false
            });
          }
        };

        if (HALO.settings.enable_charge) {
          request.getVolumePrice('volume.size', obj.size).then((res) => {
            setStates(res, true, false);
          }).catch((error) => {
            setStates(error, true, true);
          });
        } else {
          setStates({}, false);
        }
      });
    },
    onConfirm: function(refs, cb) {
      let data = {};
      data.new_size = Number(refs.capacity_size.state.value);

      request.extendVolumeSize(obj, data).then((res) => {
        callback && callback(res);
        cb(true);
      }).catch((err) => {
        let reg = new RegExp('"message":"(.*)","');
        let tip = reg.exec(err.response)[1];

        refs.error.setState({
          value: tip,
          hide: false
        });
        cb(false);
      });
    },
    onAction: function(field, state, refs) {
      switch (field) {
        case 'capacity_size':
          if (HALO.settings.enable_charge) {
            let sliderEvent = state.eventType === 'mouseup';
            let inputEvnet = state.eventType === 'change' && !state.error;

            if (sliderEvent || inputEvnet) {
              request.getVolumePrice('volume.size', state.value).then((res) => {
                refs.charge.setState({
                  value: res.unit_price
                });
              }).catch((error) => {});
            }
          }

          refs.btn.setState({
            disabled: state.error
          });
          break;
        default:
          break;
      }
    }
  };

  commonModal(props);
}

module.exports = pop;
