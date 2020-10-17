/**
 * Created by a on 6/26/2016.
 */
var ExternalUserAccessFields = require("dvp-mongomodels/model/ExternalUserAccessConfig")
  .ExternalUserAccessFields;
var messageFormatter = require("dvp-common-lite/CommonMessageGenerator/ClientMessageJsonFormatter.js");

function AddDefaultAccessibleFields(company, tenant) {
  try {
    var defaultFields = {
      name: { require: false, view_enable: true, editable: true },
      title: { require: false, view_enable: true, editable: true },
      avatar: { require: false, view_enable: true, editable: true },
      birthday: { require: false, view_enable: true, editable: true },
      gender: { require: false, view_enable: true, editable: true },
      address: { require: false, view_enable: true, editable: true },
      firstname: { require: true, view_enable: true, editable: true },
      lastname: { require: true, view_enable: true, editable: true },
      locale: { require: false, view_enable: true, editable: true },
      ssn: { require: false, view_enable: true, editable: true },
      password: { require: false, view_enable: true, editable: true },
      primary_contacts: { require: true, view_enable: true, editable: true },
      secondary_contacts: { require: false, view_enable: true, editable: true },
      contacts: { require: false, view_enable: true, editable: true },
      tags: { require: false, view_enable: true, editable: true },
      company: company,
      tenant: tenant,
    };
    var userFields = ExternalUserAccessFields(defaultFields);

    userFields.save(function (errSave, resSave) {
      if (errSave) {
        console.log(
          messageFormatter.FormatMessage(
            errSave,
            "External User Available Fields Model already available",
            false,
            undefined
          )
        );
      } else {
        if (resSave) {
          console.log(
            messageFormatter.FormatMessage(
              undefined,
              "External User Available Fields Model added successfully",
              true,
              resSave
            )
          );
        } else {
          console.log(
            messageFormatter.FormatMessage(
              new Error("Failed to add External user unaccessible feilds "),
              "Failed to add External user unaccessible feilds ",
              true,
              resSave
            )
          );
        }
      }
    });
  } catch (ex) {
    console.log("Error occurred");
  }
}

module.exports.AddDefaultAccessibleFields = AddDefaultAccessibleFields;
