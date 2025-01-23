const { platform } = require('os');

const Sequelize = require('sequelize').Sequelize; 
const DataTypes = require('sequelize').DataTypes;
const sequelize = new Sequelize('plants', 'root', 'root', {
  host: "localhost",
  dialect: "mysql",
  logging: false
});

function connection(){
  sequelize.authenticate().then(() => {
    console.log('Connection with database has been established successfully.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });
}



const plants = sequelize.define("plants", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  powerCurrency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  energyToday: {
    type: DataTypes.STRING,
    allowNull: false
  },
  battery: {
    type: DataTypes.STRING,
    allowNull: true
  },
  grid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  layout: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.STRING,
  },
  platform: {
    type: DataTypes.STRING,
  }
});

//////////// CREATE TABLE ////////////

// sequelize.sync({force:true}).then(() => {
//   console.log('plants table created successfully!');
// }).catch((error) => {
//   console.error('Unable to create table plants: ', error);
// });

function findAllPlants(res){
  sequelize.sync().then(() => {
    plants.findAll().then(resp => {
      return res.send(resp)
    }).catch((error) => {
      console.error('Failed to retrieve data : ', error);
  });
  }).catch((error) => {
    console.error('Unable to open table plants: ', error);
  })
}

function findAllPlantsWhere(req,res){
  let namearray= req.params.name.split("+");
  let name;
  if (namearray.length>1){
    name="";
    for (let i = 0 ; i<namearray.length ; i++){
        i === 0 ? name += namearray[i] : name += " "+namearray[i]
    }
  }else{
    name = req.params.name;
  }
  console.log(name);
  sequelize.sync().then(() => {
    plants.findAll({
      where: {
        name: name,
        platform: req.params.platform
    }
    }).then(resp => {
      return res.send(resp)
    }).catch((error) => {
      console.error('Failed to retrieve data : ', error);
  });
  }).catch((error) => {
    console.error('Unable to open table plants: ', error);
  })
}

function savePlants(Plants){
  sequelize.sync().then(() => {
    for (let i = 0; i < Plants.length;i++){
      plants.create({
        name: Plants[i].name,
        powerCurrency: Plants[i].powerCurrency,
        energyToday: Plants[i].energyToday,
        battery: Plants[i].battery,
        grid: Plants[i].grid,
        layout: Plants[i].layout,
        date: Plants[i].date,
        platform: Plants[i].platform
      }).then().catch((error) => {
        console.error('Failed to create a new record : ', error);
    });
    }
    
  
  }).catch((error) => {
    console.error('Unable to edit table : ', error);
  });
}


function findOnePlant(req,res){
  sequelize.sync().then(() => {

    plants.findOne({
        where: {
            id: req.params.id
        }
    }).then(resp => {
        return res.send(resp)
    }).catch((error) => {
        console.error('Failed to retrieve data : ', error);
    });
  
  }).catch((error) => {
    console.error('Unable to create table : ', error);
  });
}

function deletePlant(req,res){
  sequelize.sync().then(() => {

    plants.destroy({
        where: {
          id: req.params.id
        }
    }).then(() => {
        console.log("Successfully deleted record.")
    }).catch((error) => { 
        console.error('Failed to delete record : ', error);
    });
  
  }).catch((error) => {
      console.error('Unable to create table : ', error);
  });
}

module.exports = {
  connection,
  findAllPlants,
  findAllPlantsWhere,
  findOnePlant,
  savePlants,
  deletePlant
}