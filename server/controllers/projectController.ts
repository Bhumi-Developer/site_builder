import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import openai from "../config/openai.js";
import { getSingleString } from "../types/helper.js";


function extractPureHTML(aiText: string): string {
    if (!aiText) {
      throw new Error("Empty AI response");
    }
  
    // Strictly extract <!DOCTYPE html> ... </html>
    const htmlMatch = aiText.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
  
    if (!htmlMatch) {
      throw new Error("AI did not return valid HTML");
    }
  
    return htmlMatch[0].trim();
  }

export const makeRevision = async(req: Request, res: Response) =>{
  const userId = getSingleString(req.userId, "userId");
  try {
      
      const projectId = getSingleString(req.params.projectId, "projectId");

      const { message } = req.body;
      const user = await prisma.user.findUnique({
          where: {id: userId}
      })
      if(!userId || ! user){
          return res.status(401).json({message: 'Unauthorized'})
      }
      if(user.credits < 5){
          return res.status(403).json({message: 'Add more credits to make changes'})
      }
      if(!message || message.trim()===''){
          return res.status(401).json({message: 'Please enter a valid prompt'})
      }
      const currentProject = await prisma.websiteProject.findUnique({
          where: {id: projectId, userId},
          include: {versions: true}
      })
      if(!currentProject){
          return res.status(404).json({message: 'Project not found'})
      }
      await prisma.conversation.create({
          data: {
             role: 'user',
             content: message,
             projectId 
          }
      })
      await prisma.user.update({
          where: {id: userId},
          data: {credits: {decrement: 5}}
      })
      const promptEnhanceResponse = await openai.chat.completions.create({
          model: "tngtech/deepseek-r1t-chimera:free",
          messages: [
            {
              "role": "system",
              "content": `
You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

  Enhance this by:
  1. Being specific about what elements to change
  2. Mentioning design details (colors, spacing, sizes)
  3. Clarifying the desired outcome
  4. Using clear technical terms

Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`
            },{
              role: 'user',
              content: `User's request: '${message}'`
            }
          ],
      })
      const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;
      await prisma.conversation.create({
          data: {
              role: 'assistant',
              content: `I 've enhanced your prompt to: "${enhancedPrompt}"`,
              projectId
          }
      })
      await prisma.conversation.create({
          data: {
              role: 'assistant',
              content: 'now generating your website...',
              projectId
          }
      })
      
      const codeGenerationResponse = await openai.chat.completions.create({
          model: "tngtech/deepseek-r1t-chimera:free",
          messages: [
            {
              "role": "system",
              "content": `
You are an expert web developer. 

  CRITICAL REQUIREMENTS:
  - Return ONLY the complete updated HTML code with the requested changes.
  - Use Tailwind CSS for ALL styling (NO custom CSS).
  - Use Tailwind utility classes for all styling changes.
  - Include all JavaScript in <script> tags before closing </body>
  - Make sure it's a complete, standalone HTML document with Tailwind CSS
  - Return the HTML Code Only, nothing else

  Apply the requested changes while maintaining the Tailwind CSS styling approach.`
            },{
              role: 'user',
              content: `Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
            }]
      })

      
      const rawAIResponse =
      codeGenerationResponse.choices[0].message.content || "";

      let finalHTML: string;
      
      try {
        finalHTML = extractPureHTML(rawAIResponse);
      } catch (err) {
        await prisma.conversation.create({
          data: {
            role: "assistant",
            content: "Failed to generate valid HTML. Please try again.",
            projectId
          }
        });
      
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: 5 } }
        });
      
        return;
      }
      

        // if(!code){
        //     await prisma.conversation.create({
        //         data: {
        //             role: 'assistant',
        //             content: "Unable to generate the code, please try again",
        //             projectId: project.id
        //         }
        //     })
        //     await prisma.user.update({
        //         where: {id: userId},
        //         data: {credits: {increment: 5}}
        //     })
        //     return;
        // }


        const version = await prisma.version.create({
            data: {
                code: finalHTML,
                description: 'Initial version',
                projectId
            }
        })
      await prisma.conversation.create({
          data: {
              role: 'assistant',
              content: "I 've made the changes to your website! You can now preview it",
              projectId
          }
      })
      await prisma.websiteProject.update({
        where: { id: projectId },
        data: {
          current_code: finalHTML,
          current_version_index: version.id
        }
      });

      res.json({message: "Changes made successfully"})
  } catch (error: any) {
      await prisma.user.update({
          where: {id: userId},
          data: {credits: {increment: 5}}
      })
      console.log(error.code || error.message);
      res.status(500).json({message: error.message})
  }
}


export const rollbackToVersion = async(req: Request, res: Response) =>{
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({message: 'Unauthorized'})
        }
       const projectId = getSingleString(req.params.projectId,"projectId");
       const versionId = getSingleString(req.params.versionId,"versionId");
       const project = await prisma.websiteProject.findUnique({
        where: {id: projectId, userId},
        include: {
           versions:true
        }
       })
       if(!project){
        return res.status(404).json({message: 'Project not found'})
       }
       const version = project.versions.find((version: any) => version.id === versionId)

       if(!version){
        return res.status(404).json({message: 'Version not found'})
       }
       await prisma.websiteProject.update({
        where: {id: projectId,userId},
        data: {
            current_code: version.code,
            current_version_index: version.id
        }
       })
       await prisma.conversation.create({
        data: {
            role: 'assistant',
            content: "I 've rolled back to your website to selected version! You can now preview it",
            projectId
        }
    })

        res.json({message: 'Version rolled back'})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}

export const deleteProject = async(req: Request, res: Response) =>{
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const projectId = getSingleString(req.params.projectId,"projectId");
       await prisma.websiteProject.delete({
        where: {id: projectId, userId},
       
       })
       
        res.json({message: 'Project deleted Successfully'})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}

export const getProjectPreview = async(req: Request, res: Response) =>{
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const projectId = getSingleString(req.params.projectId,"projectId");
       const project = await prisma.websiteProject.findUnique({
        where: {id: projectId, userId},
        include: {
           versions:true
        }
       })
       if(!project){
        return res.status(404).json({message: 'Project not found'})
       }
        res.json({project})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}

export const getPublishedProjects = async(req: Request, res: Response) =>{
    try {
      
       const projects = await prisma.websiteProject.findMany({
        where: {isPublished: true},
        include: {
           user:true
        }
       })
       
        res.json({projects})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}

export const getProjectById = async(req: Request, res: Response) =>{
    try {
        const projectId = getSingleString(req.params.projectId,"projectId");
       const project = await prisma.websiteProject.findFirst({
        where: {id: projectId},
       })
       if(!project || project.isPublished === false || !project?.current_code){
        return res.status(404).json({message: "Project not found"})
       }
        res.json({code: project.current_code})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}

export const saveProjectCode = async(req: Request, res: Response) =>{
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const projectId = getSingleString(req.params.projectId,"projectId");
       const {code} = req.body;
       if(!code){
        return res.status(401).json({message: 'Code is required'})
       }
       const project = await prisma.websiteProject.findUnique({
        where: {id: projectId, userId},
        include: {
           versions:true
        }
       })
       if(!project){
        return res.status(404).json({message: 'Project not found'})
       }
       await prisma.websiteProject.update({
        where: {id: projectId},
        data: {current_code: code, current_version_index: ''}
       })
        res.json({message: "Project saved successfully"})
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message})
    }
}