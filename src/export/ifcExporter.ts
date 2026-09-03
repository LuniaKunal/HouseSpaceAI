import { sceneStore } from '../state/sceneStore';
import { FT_TO_M } from '../types/scene';

export function exportIFC4Scene(): Blob {
  const state = sceneStore.getSceneState();
  const timestamp = new Date().toISOString();

  // Structure-first IFC4 text representation with STEP physical file format headers
  let ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('HouseSpace_Design_${Date.now()}.ifc','${timestamp}',('HouseSpace Studio Designer'),('HouseSpace Architecture Studio'),'HouseSpace WebMCP IFC4 Generator','HouseSpace Studio 1.0','Approved');
FILE_SCHEMA(('IFC4'));
ENDSEC;

DATA;
#1=IFCPROJECT('1ProjectHouseSpaceID0001',#2,'HouseSpace Residential Project',$,$,$,$,(#3),#4);
#2=IFCOWNERHISTORY(#5,#6,$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)});
#3=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#7,#8);
#4=IFCUNITASSIGNMENT((#9,#10,#11));
#5=IFCPERSONANDORGANIZATION(#12,#13,$);
#6=IFCAPPLICATION(#13,'1.0','HouseSpace WebMCP Studio','HouseSpace');
#7=IFCAXIS2PLACEMENT3D(#14,#15,#16);
#8=IFCDIRECTION((0.,1.,0.));
#9=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#10=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);
#11=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#12=IFCPERSON('USR01','Designer','Human & Agent',$,$,$,$,$);
#13=IFCORGANIZATION('ORG01','HouseSpace Studio','Browser Architecture AI',$,$);
#14=IFCCARTESIANPOINT((0.,0.,0.));
#15=IFCDIRECTION((0.,0.,1.));
#16=IFCDIRECTION((1.,0.,0.));
#17=IFCSITE('1SiteHouseSpaceID000001',#2,'HouseSpace Apartment Site',$,$,#7,$,$,.ELEMENT.,$,$,$,$,$);
#18=IFCBUILDING('1BldgHouseSpaceID00001',#2,'Residential Apartment Unit',$,$,#7,$,$,.ELEMENT.,$,$,$);
#19=IFCBUILDINGSTOREY('1StoryHouseSpaceID001',#2,'Level 1',$,$,#7,$,$,.ELEMENT.,0.);
`;

  let entityId = 20;

  // Add Rooms as IfcSpace
  state.rooms.forEach(room => {
    const spaceId = entityId++;
    const areaM2 = (room.width * room.depth * FT_TO_M * FT_TO_M).toFixed(2);
    const heightM = (room.height * FT_TO_M).toFixed(2);
    const posX = (room.position.x * FT_TO_M).toFixed(3);
    const posZ = (room.position.z * FT_TO_M).toFixed(3);

    ifcContent += `#${spaceId}=IFCSPACE('${room.id}',#2,'${room.name}','Room Area: ${room.width * room.depth} sqft',$,#7,$,'${room.floorMaterial}',.ELEMENT.,.INTERNAL.,$);\n`;
    ifcContent += `/* Space ${room.name}: Dim=(${room.width}x${room.depth} ft), Pos=(${posX}, 0, ${posZ}), Area=${areaM2}m2, H=${heightM}m */\n`;
  });

  // Add Furniture as IfcFurnishingElement
  state.furniture.forEach(item => {
    const furnId = entityId++;
    const posX = (item.position.x * FT_TO_M).toFixed(3);
    const posY = (item.position.y * FT_TO_M).toFixed(3);
    const posZ = (item.position.z * FT_TO_M).toFixed(3);
    ifcContent += `#${furnId}=IFCFURNISHINGELEMENT('${item.id}',#2,'${item.name}','Category: ${item.category}, Type: ${item.type}',$,#7,$,'${item.material}');\n`;
    ifcContent += `/* Object ${item.name}: Room=${item.roomId || 'unassigned'}, Pos=(${posX}, ${posY}, ${posZ}), Rot=(${item.rotation.x},${item.rotation.y},${item.rotation.z}) */\n`;
  });

  ifcContent += `ENDSEC;
END-ISO-10303-21;`;

  return new Blob([ifcContent], { type: 'application/x-step' });
}
